import { db } from "@/lib/db";
import { hasPermission, ForbiddenError, regionForBundesland, type CurrentUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { normalizeEmail, normalizePhone } from "@/lib/utils";
import type { ReferralStatus } from "@prisma/client";

/** Interne Bearbeitung von Mitarbeiterempfehlungen. */

export async function changeReferralStatus(
  user: CurrentUser,
  referralId: string,
  toStatus: ReferralStatus,
  comment?: string,
) {
  if (!hasPermission(user, "referrals.manage")) throw new ForbiddenError();
  const referral = await db.referral.findUniqueOrThrow({ where: { id: referralId } });
  await db.$transaction([
    db.referral.update({ where: { id: referralId }, data: { status: toStatus } }),
    db.referralStatusHistory.create({
      data: { referralId, fromStatus: referral.status, toStatus, changedById: user.id, comment: comment || null },
    }),
  ]);
  await audit({
    action: "referral.status.changed",
    actorId: user.id,
    entityType: "Referral",
    entityId: referralId,
    meta: { from: referral.status, to: toStatus },
  });
}

/**
 * „In Bewerbung übernehmen": erzeugt Candidate + Application aus der Empfehlung.
 * Referral-Datensatz und -Historie bleiben erhalten, Quelle bleibt Mitarbeiterempfehlung.
 */
export async function convertReferral(user: CurrentUser, referralId: string, opts?: { linkCandidateId?: string }) {
  if (!hasPermission(user, "referrals.manage")) throw new ForbiddenError();
  const referral = await db.referral.findUniqueOrThrow({ where: { id: referralId } });

  if (referral.status === "IN_BEWERBUNG_UEBERNOMMEN") throw new Error("Diese Empfehlung wurde bereits übernommen.");
  if (!referral.referredFirstName || !referral.referredLastName || !referral.referredBundesland) {
    throw new Error("Für die Übernahme fehlen Daten der empfohlenen Person (Name/Bundesland).");
  }
  if (!referral.referredEmail && !referral.referredPhone) {
    throw new Error("Für die Übernahme wird mindestens Telefon oder E-Mail benötigt.");
  }

  const responsibleRegionId = await regionForBundesland(referral.referredBundesland);
  const email = referral.referredEmail ?? `keine-email-${referral.id}@invalid.local`;
  const phone = referral.referredPhone ?? "";

  const result = await db.$transaction(async (tx) => {
    const candidate = opts?.linkCandidateId
      ? await tx.candidate.findUniqueOrThrow({ where: { id: opts.linkCandidateId } })
      : await tx.candidate.create({
          data: {
            firstName: referral.referredFirstName as string,
            lastName: referral.referredLastName as string,
            email,
            emailNormalized: normalizeEmail(email),
            phone,
            phoneNormalized: phone ? normalizePhone(phone) : `ref-${referral.id}`,
            city: referral.referredCity ?? "",
            bundesland: referral.referredBundesland as NonNullable<typeof referral.referredBundesland>,
            source: "MITARBEITEREMPFEHLUNG",
          },
        });

    const application = await tx.application.create({
      data: {
        candidateId: candidate.id,
        type: "INITIATIV",
        bundesland: referral.referredBundesland as NonNullable<typeof referral.referredBundesland>,
        city: referral.referredCity ?? candidate.city,
        driversLicense: false,
        previousActivity: referral.note ? `Aus Empfehlung: ${referral.note}` : "Aus Mitarbeiterempfehlung übernommen",
        availableFrom: "nach Absprache",
        responsibleRegionId,
        source: "MITARBEITEREMPFEHLUNG",
        referralId: referral.id,
        consentVersion: referral.consentVersion ?? "referral",
      },
    });
    await tx.applicationStatusHistory.create({
      data: { applicationId: application.id, toAuto: "NEU", changedById: user.id, comment: "Aus Empfehlung übernommen" },
    });
    await tx.candidateAssignment.create({
      data: { applicationId: application.id, regionId: responsibleRegionId, assignedById: user.id, reason: "Übernahme aus Empfehlung" },
    });
    await tx.referral.update({
      where: { id: referralId },
      data: { status: "IN_BEWERBUNG_UEBERNOMMEN", convertedCandidateId: candidate.id },
    });
    await tx.referralStatusHistory.create({
      data: { referralId, fromStatus: referral.status, toStatus: "IN_BEWERBUNG_UEBERNOMMEN", changedById: user.id },
    });
    return { candidate, application };
  });

  await audit({
    action: "referral.converted",
    actorId: user.id,
    entityType: "Referral",
    entityId: referralId,
    meta: { applicationId: result.application.id, linkedExisting: Boolean(opts?.linkCandidateId) },
  });
  return result;
}

/** Duplikat-Hinweise für eine Empfehlung (E-Mail/Telefon-Treffer). */
export async function referralDuplicates(referral: { referredEmail: string | null; referredPhone: string | null }) {
  const or = [];
  if (referral.referredEmail) or.push({ emailNormalized: normalizeEmail(referral.referredEmail) });
  if (referral.referredPhone) or.push({ phoneNormalized: normalizePhone(referral.referredPhone) });
  if (!or.length) return [];
  return db.candidate.findMany({
    where: { OR: or, anonymizedAt: null },
    select: { id: true, firstName: true, lastName: true, city: true, email: true },
    take: 5,
  });
}
