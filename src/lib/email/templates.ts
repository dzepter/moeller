import { env } from "@/lib/env";
import { BUNDESLAND_LABEL } from "@/lib/utils";
import type { Bundesland } from "@prisma/client";

/**
 * E-Mail-Templates (Text). Interne Mails enthalten bewusst nur Name, Stelle,
 * Bundesland und einen geschützten Link – keine vollständigen Bewerberdaten.
 */

const footer = `\n\n--\nMöller GmbH · Beratungs- & Vertriebsgesellschaft\nMax-Planck-Str. 8 · 55435 Gau-Algesheim\nTelefon 06725 / 919350 · info@bvg-moeller.de`;

export function tplNeueBewerbungIntern(p: {
  name: string;
  stelle: string;
  bundesland: Bundesland;
  applicationId: string;
}) {
  return {
    subject: `Neue Bewerbung: ${p.name} – ${p.stelle} (${BUNDESLAND_LABEL[p.bundesland]})`,
    text: `Hallo,

es ist eine neue Bewerbung eingegangen:

Name: ${p.name}
Stelle: ${p.stelle}
Bundesland: ${BUNDESLAND_LABEL[p.bundesland]}

Zur Bewerbung (Anmeldung erforderlich):
${env.baseUrl}/admin/bewerbungen/${p.applicationId}
${footer}`,
  };
}

/** Kontaktzeile aus zentralen Settings (contact.openingHours / contact.phone) – nie hart codieren. */
export type ContactInfo = { hoursLabel: string; phone: string };

export function tplEingangsbestaetigung(p: { firstName: string; stelle: string | null; contact: ContactInfo }) {
  return {
    subject: "Deine Bewerbung bei Möller ist angekommen",
    text: `Hallo ${p.firstName},

danke für Deine Bewerbung${p.stelle ? ` als ${p.stelle}` : " bei der Möller GmbH"} – sie ist gut bei uns angekommen.

So geht es jetzt weiter: Unser Innendienst schaut sich Deine Angaben an und meldet sich in der Regel innerhalb weniger Werktage telefonisch oder per E-Mail bei Dir. Du musst nichts weiter tun.

Wenn Du vorab Fragen hast, erreichst Du uns ${p.contact.hoursLabel} unter ${p.contact.phone}.

Viele Grüße
Dein Möller-Team
${footer}`,
  };
}

export function tplNeueEmpfehlungIntern(p: {
  referrerName: string;
  referredName: string | null;
  bundesland: Bundesland | null;
  referralId: string;
}) {
  return {
    subject: `Neue Mitarbeiterempfehlung von ${p.referrerName}`,
    text: `Hallo,

es ist eine neue Mitarbeiterempfehlung eingegangen:

Empfohlen von: ${p.referrerName}
Empfohlene Person: ${p.referredName ?? "trägt sich selbst über den Empfehlungslink ein"}
Region: ${p.bundesland ? BUNDESLAND_LABEL[p.bundesland] : "–"}

Zur Empfehlung (Anmeldung erforderlich):
${env.baseUrl}/admin/empfehlungen/${p.referralId}
${footer}`,
  };
}

export function tplReferralEinladung(p: { referrerFirstName: string; code: string }) {
  return {
    subject: `${p.referrerFirstName} empfiehlt Dir einen Job bei Möller`,
    text: `Hallo,

${p.referrerFirstName} arbeitet mit der Möller GmbH zusammen und meint: Das könnte auch etwas für Dich sein.

Wir sind eine Beratungs- und Vertriebsgesellschaft mit über 25 Jahren Erfahrung und langfristigen Projekten im Handel – und wir suchen laufend freundliche, zuverlässige Menschen. Auch Quereinsteiger sind bei uns ausdrücklich willkommen.

Wenn Du magst, trag hier unverbindlich Deine Kontaktdaten ein – wir melden uns dann persönlich bei Dir:
${env.baseUrl}/empfehlen/${p.code}

Viele Grüße
Dein Möller-Team
${footer}`,
  };
}

export function tplNeuerChatIntern(p: { conversationId: string; topic: string | null }) {
  return {
    subject: "Neue Chat-Anfrage auf der Website",
    text: `Hallo,

auf der Website wurde ein neuer Chat gestartet${p.topic ? ` (Thema: ${p.topic})` : ""}.

Zum Chat (Anmeldung erforderlich):
${env.baseUrl}/admin/chats/${p.conversationId}
${footer}`,
  };
}

export function tplAcademyEinladung(p: { firstName: string; courseTitle: string; link: string; validDays: number; contact: ContactInfo }) {
  return {
    subject: `Dein Zugang zur Möller Academy – ${p.courseTitle}`,
    text: `Hallo ${p.firstName},

schön, dass Du bei Möller startest! Damit Du gut vorbereitet in Deine ersten Einsätze gehst, haben wir Deine persönliche Online-Schulung freigeschaltet:

${p.link}

Ein paar Hinweise:
- Der Link ist nur für Dich bestimmt und ${p.validDays} Tage gültig.
- Du kannst jederzeit unterbrechen und später weitermachen – Dein Fortschritt wird gespeichert.
- Die Schulung funktioniert auch gut am Smartphone.

Bei Fragen erreichst Du unser Büro ${p.contact.hoursLabel} unter ${p.contact.phone}.

Viele Grüße
Jana & Jasmin
Innendienst Möller GmbH
${footer}`,
  };
}

export function tplAcademyErinnerung(p: { firstName: string; courseTitle: string; link: string; contact: ContactInfo }) {
  return {
    subject: `Kleine Erinnerung: Deine Möller-Schulung wartet`,
    text: `Hallo ${p.firstName},

Deine Online-Schulung „${p.courseTitle}" ist noch nicht abgeschlossen. Nimm Dir gern in Ruhe Zeit dafür – Dein Fortschritt bleibt gespeichert:

${p.link}

Bei Fragen sind wir ${p.contact.hoursLabel} unter ${p.contact.phone} für Dich da.

Viele Grüße
Dein Möller-Team
${footer}`,
  };
}

export function tplPasswortReset(p: { name: string; link: string }) {
  return {
    subject: "Passwort zurücksetzen – Möller Intern",
    text: `Hallo ${p.name},

für Dein Konto wurde ein Passwort-Reset angefordert. Über diesen Link kannst Du innerhalb von 60 Minuten ein neues Passwort vergeben:

${p.link}

Wenn Du das nicht warst, kannst Du diese E-Mail ignorieren.
${footer}`,
  };
}
