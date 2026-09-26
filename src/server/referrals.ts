import { db } from "@/lib/db";
import { generateCode } from "@/lib/crypto";
import { getSetting } from "@/lib/settings";
import { sendMail } from "@/lib/email";
import { tplNeueEmpfehlungIntern } from "@/lib/email/templates";
import { audit } from "@/lib/audit";
import { normalizeEmail, normalizePhone } from "@/lib/utils";
import type { Bundesland } from "@prisma/client";

/**
 * Mitarbeiterempfehlungen (Masterprompt §23):
 * Variante A – Empfehlungslink: Promotor erhält Code, empfohlene Person trägt
 *   ihre Daten selbst ein (datenschutzfreundlich, keine Daten Dritter).
 * Variante B – Direktempfehlung mit dokumentierter Einwilligung.
 */

export async function createReferralLink(input: {
  referrerFirstName: string;
  referrerLastName: string;
  referrerContact: string;
  referrerEmployeeNo?: string;
}) {
  const isEmail = input.referrerContact.includes("@");
  let code = generateCode(8);
  // Kollisionen sind extrem unwahrscheinlich – trotzdem absichern
  while (await db.referral.findUnique({ where: { code } })) code = generateCode(8);

  const referral = await db.referral.create({
    data: {
      type: "LINK",
      code,
      referrerFirstName: input.referrerFirstName,
      referrerLastName: input.referrerLastName,
      referrerEmail: isEmail ? input.referrerContact : null,
      referrerPhone: isEmail ? null : input.referrerContact,
      referrerEmployeeNo: input.referrerEmployeeNo || null,
      status: "EMPFEHLUNG_NEU",
    },
  });
  await db.referralStatusHistory.create({
    data: { referralId: referral.id, toStatus: "EMPFEHLUNG_NEU", comment: "Empfehlungslink erzeugt" },
  });
  await audit({ action: "referral.created", actorType: "VISITOR", entityType: "Referral", entityId: referral.id, meta: { type: "LINK" } });
  return referral;
}

export async function getReferralByCode(code: string) {
  return db.referral.findUnique({ where: { code: code.toUpperCase() } });
}

/** Variante A, Schritt 2: Empfohlene Person trägt sich selbst ein. */
export async function completeReferralSelf(input: {
  code: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  bundesland: Bundesland;
  note?: string;
}) {
  const referral = await db.referral.findUnique({ where: { code: input.code.toUpperCase() } });
  if (!referral || referral.type !== "LINK") throw new Error("Dieser Empfehlungslink ist ungültig.");
  if (referral.referredFirstName) throw new Error("Über diesen Link wurde bereits eine Empfehlung eingetragen.");

  const updated = await db.referral.update({
    where: { id: referral.id },
    data: {
      referredFirstName: input.firstName,
      referredLastName: input.lastName,
      referredPhone: input.phone,
      referredEmail: input.email,
      referredCity: input.city,
      referredBundesland: input.bundesland,
      note: input.note || null,
      status: "KONTAKT_AUSSTEHEND",
    },
  });
  await db.referralStatusHistory.create({
    data: { referralId: referral.id, fromStatus: referral.status, toStatus: "KONTAKT_AUSSTEHEND", comment: "Empfohlene Person hat sich selbst eingetragen" },
  });
  await notifyInternal(updated.id);
  return updated;
}

/** Variante B: Direktempfehlung mit Pflicht-Consent. */
export async function createDirectReferral(input: {
  referrerFirstName: string;
  referrerLastName: string;
  referrerContact: string;
  referrerEmployeeNo?: string;
  referredFirstName: string;
  referredLastName: string;
  referredPhone: string;
  referredEmail: string;
  referredCity: string;
  referredBundesland: Bundesland;
  note?: string;
}) {
  const consentVersion = await getSetting("referrals.consentVersion");
  const consentText = await getSetting("referrals.consentText");
  const isEmail = input.referrerContact.includes("@");

  const referral = await db.referral.create({
    data: {
      type: "DIREKT",
      referrerFirstName: input.referrerFirstName,
      referrerLastName: input.referrerLastName,
      referrerEmail: isEmail ? input.referrerContact : null,
      referrerPhone: isEmail ? null : input.referrerContact,
      referrerEmployeeNo: input.referrerEmployeeNo || null,
      referredFirstName: input.referredFirstName,
      referredLastName: input.referredLastName,
      referredPhone: input.referredPhone,
      referredEmail: input.referredEmail,
      referredCity: input.referredCity,
      referredBundesland: input.referredBundesland,
      note: input.note || null,
      consentConfirmed: true,
      consentVersion,
      consentAt: new Date(),
      status: "KONTAKT_AUSSTEHEND",
    },
  });
  await db.consentRecord.create({
    data: { kind: "REFERRAL_DIREKT", version: consentVersion, textSnippet: consentText, referralId: referral.id },
  });
  await db.referralStatusHistory.create({
    data: { referralId: referral.id, toStatus: "KONTAKT_AUSSTEHEND", comment: "Direktempfehlung mit bestätigtem Einverständnis" },
  });
  await audit({ action: "referral.created", actorType: "VISITOR", entityType: "Referral", entityId: referral.id, meta: { type: "DIREKT" } });
  await notifyInternal(referral.id);
  return referral;
}

async function notifyInternal(referralId: string) {
  const referral = await db.referral.findUniqueOrThrow({ where: { id: referralId } });
  const recipients = await getSetting("notifications.referralRecipients");
  const mail = tplNeueEmpfehlungIntern({
    referrerName: `${referral.referrerFirstName} ${referral.referrerLastName}`,
    referredName:
      referral.referredFirstName && referral.referredLastName
        ? `${referral.referredFirstName} ${referral.referredLastName}`
        : null,
    bundesland: referral.referredBundesland,
    referralId: referral.id,
  });
  for (const to of recipients) {
    await sendMail({ to, subject: mail.subject, text: mail.text, template: "empfehlung-intern", relatedType: "Referral", relatedId: referral.id });
  }
}

/** Duplikat-Warnung bei E-Mail-/Telefon-Treffern gegen bestehende Kandidaten. */
export async function referralDuplicateHints(referralId: string) {
  const referral = await db.referral.findUnique({ where: { id: referralId } });
  if (!referral?.referredEmail && !referral?.referredPhone) return [];
  const conditions = [];
  if (referral.referredEmail) conditions.push({ emailNormalized: normalizeEmail(referral.referredEmail) });
  if (referral.referredPhone) conditions.push({ phoneNormalized: normalizePhone(referral.referredPhone) });
  return db.candidate.findMany({
    where: { OR: conditions, anonymizedAt: null },
    select: { id: true, firstName: true, lastName: true, city: true, email: true, phone: true },
    take: 5,
  });
}
