import { db } from "@/lib/db";
import { normalizeEmail, normalizePhone } from "@/lib/utils";
import { regionForBundesland } from "@/lib/rbac";
import { getSetting } from "@/lib/settings";
import { sendMail } from "@/lib/email";
import { tplEingangsbestaetigung, tplNeueBewerbungIntern } from "@/lib/email/templates";
import { audit } from "@/lib/audit";
import type { ApplicationInput } from "@/lib/validation";
import type { CandidateSource } from "@prisma/client";
import { randomFileName, storage, validateUpload, detectedMime, malwareScanner } from "@/lib/storage";

/**
 * Bewerbung entgegennehmen: Kandidat finden/anlegen (Duplikat-schonend),
 * Bewerbung speichern, Region zuordnen, Consent dokumentieren, Mails senden.
 */
export async function submitApplication(
  input: ApplicationInput,
  opts?: {
    cv?: { name: string; data: Buffer } | null;
    source?: CandidateSource;
    referralId?: string;
  },
) {
  const jobSlug = input.jobSlug;
  const job = jobSlug ? await db.job.findUnique({ where: { slug: jobSlug } }) : null;
  if (jobSlug && (!job || job.status !== "VEROEFFENTLICHT")) {
    throw new Error("Diese Stelle ist nicht mehr verfügbar.");
  }

  const emailNormalized = normalizeEmail(input.email);
  const phoneNormalized = normalizePhone(input.phone);
  const source: CandidateSource = opts?.source ?? (job ? "WEBSITE" : "INITIATIV");

  const consentVersion = await getSetting("applications.consentVersion");
  const consentText = await getSetting("applications.consentText");
  const responsibleRegionId = await regionForBundesland(input.bundesland);

  // Kandidat wiederverwenden, wenn E-Mail exakt passt (kein automatisches Mergen darüber hinaus)
  const existing = await db.candidate.findFirst({
    where: { emailNormalized, anonymizedAt: null },
    orderBy: { createdAt: "desc" },
  });

  // Optionaler Lebenslauf
  let cvFileId: string | undefined;
  if (opts?.cv) {
    if (!job?.cvUploadEnabled) throw new Error("Für diese Stelle ist kein Datei-Upload vorgesehen.");
    const validationError = validateUpload(opts.cv.name, opts.cv.data, ["pdf", "image"]);
    if (validationError) throw new Error(validationError);
    const scan = await malwareScanner.scan(opts.cv.data);
    if (!scan.clean) throw new Error("Die Datei konnte nicht angenommen werden.");
  }

  const result = await db.$transaction(async (tx) => {
    const candidate = existing
      ? await tx.candidate.update({
          where: { id: existing.id },
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            phoneNormalized,
            city: input.city,
            bundesland: input.bundesland,
          },
        })
      : await tx.candidate.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            emailNormalized,
            phone: input.phone,
            phoneNormalized,
            city: input.city,
            bundesland: input.bundesland,
            source,
          },
        });

    if (opts?.cv && job?.cvUploadEnabled) {
      const fileName = randomFileName(opts.cv.name);
      await storage.put("private", fileName, opts.cv.data, detectedMime(opts.cv.name, opts.cv.data));
      const file = await tx.privateFile.create({
        data: {
          candidateId: candidate.id,
          kind: "CV",
          fileName,
          originalName: opts.cv.name.slice(0, 200),
          mime: detectedMime(opts.cv.name, opts.cv.data),
          size: opts.cv.data.length,
        },
      });
      cvFileId = file.id;
    }

    const application = await tx.application.create({
      data: {
        candidateId: candidate.id,
        jobId: job?.id ?? null,
        type: job ? "STELLE" : "INITIATIV",
        bundesland: input.bundesland,
        city: input.city,
        driversLicense: input.driversLicense === "ja",
        ownCar: input.ownCar ? input.ownCar === "ja" : null,
        previousActivity: input.previousActivity,
        availableFrom: input.availableFrom,
        message: input.message || null,
        cvFileId,
        responsibleRegionId,
        source,
        referralId: opts?.referralId,
        utmSource: input.utmSource || null,
        utmMedium: input.utmMedium || null,
        utmCampaign: input.utmCampaign || null,
        consentVersion,
      },
    });

    await tx.applicationStatusHistory.create({
      data: { applicationId: application.id, toAuto: "NEU", comment: "Bewerbung eingegangen" },
    });
    await tx.candidateAssignment.create({
      data: { applicationId: application.id, regionId: responsibleRegionId, reason: "Automatische regionale Zuordnung" },
    });
    await tx.consentRecord.create({
      data: {
        kind: "BEWERBUNG",
        version: consentVersion,
        textSnippet: consentText,
        candidateId: candidate.id,
      },
    });
    return { candidate, application };
  });

  await audit({
    action: "application.created",
    actorType: "VISITOR",
    entityType: "Application",
    entityId: result.application.id,
    meta: { bundesland: input.bundesland, job: job?.slug ?? "initiativ", source },
  });

  // Interne Benachrichtigung (datensparsam) + Eingangsbestätigung
  const recipients = await getSetting("notifications.applicationRecipients");
  const intern = tplNeueBewerbungIntern({
    name: `${input.firstName} ${input.lastName}`,
    stelle: job?.title ?? "Initiativbewerbung",
    bundesland: input.bundesland,
    applicationId: result.application.id,
  });
  for (const to of recipients) {
    await sendMail({
      to,
      subject: intern.subject,
      text: intern.text,
      template: "bewerbung-intern",
      relatedType: "Application",
      relatedId: result.application.id,
    });
  }
  const confirm = tplEingangsbestaetigung({ firstName: input.firstName, stelle: job?.title ?? null });
  await sendMail({
    to: input.email,
    subject: confirm.subject,
    text: confirm.text,
    template: "eingangsbestaetigung",
    relatedType: "Application",
    relatedId: result.application.id,
  });

  return result;
}

/** Duplikat-Hinweise für die interne Ansicht (kein automatisches Mergen). */
export async function findDuplicateHints(candidateId: string) {
  const candidate = await db.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) return [];
  return db.candidate.findMany({
    where: {
      id: { not: candidate.id },
      anonymizedAt: null,
      OR: [
        { emailNormalized: candidate.emailNormalized },
        { phoneNormalized: candidate.phoneNormalized },
        { AND: [{ lastName: { equals: candidate.lastName, mode: "insensitive" } }, { city: { equals: candidate.city, mode: "insensitive" } }] },
      ],
    },
    select: { id: true, firstName: true, lastName: true, city: true, email: true, phone: true, createdAt: true },
    take: 5,
  });
}
