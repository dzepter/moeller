import { db } from "@/lib/db";
import type { Bundesland } from "@prisma/client";

/**
 * Zentrale, typisierte Systemeinstellungen mit Defaults.
 * Alle Werte sind im Adminbereich änderbar; Defaults folgen dem Masterprompt.
 */

export type OpeningHours = {
  /** 1 = Montag … 7 = Sonntag */
  days: number[];
  /** Zeitfenster "HH:MM"–"HH:MM" (mehrere möglich, z. B. Vormittag/Nachmittag) */
  windows: Array<{ from: string; to: string }>;
  label: string;
};

export type SettingDefs = {
  "contact.phone": string;
  "contact.email": string;
  "contact.applicationEmail": string;
  "contact.whatsappNumber": string; // E.164 ohne "+", für wa.me
  "contact.address": { company: string; street: string; zip: string; city: string };
  "contact.openingHours": OpeningHours;
  "whatsapp.text.bewerber": string;
  "whatsapp.text.unternehmen": string;
  "whatsapp.text.allgemein": string;
  "regions.bundeslandMapping": Record<Bundesland, "NRW" | "HESSEN" | "BAYERN">;
  "notifications.applicationRecipients": string[];
  "notifications.referralRecipients": string[];
  "notifications.chatRecipients": string[];
  "chat.reNotifyAfterMinutes": number;
  "retention.rejectedApplicationsDays": number;
  "retention.completedApplicationsDays": number;
  "retention.chatDays": number;
  "retention.referralDays": number;
  "retention.rateLimitHours": number;
  "features.referencesPage": boolean;
  "features.faqPage": boolean;
  "features.teamSection": boolean;
  "features.referralIncentives": boolean;
  "features.analytics": boolean;
  "security.mfaRequiredForAdmins": boolean;
  "academy.invitationValidityDays": number;
  "academy.passScorePct": number;
  "academy.reminders.enabled": boolean;
  "academy.reminders.notStartedAfterDays": number;
  "academy.reminders.notCompletedAfterDays": number;
  "applications.consentVersion": string;
  "applications.consentText": string;
  "referrals.consentVersion": string;
  "referrals.consentText": string;
};

export const SETTING_DEFAULTS: SettingDefs = {
  "contact.phone": "06725 / 919350",
  "contact.email": "info@bvg-moeller.de",
  "contact.applicationEmail": "bewerbung@bvg-moeller.de",
  "contact.whatsappNumber": "496725919350",
  "contact.address": {
    company: "Möller GmbH",
    street: "Max-Planck-Str. 8",
    zip: "55435",
    city: "Gau-Algesheim",
  },
  "contact.openingHours": {
    days: [1, 2, 3, 4, 5],
    windows: [{ from: "08:00", to: "17:00" }],
    label: "Montag bis Freitag, 08:00–17:00 Uhr",
  },
  "whatsapp.text.bewerber": "Hallo, ich interessiere mich für eine Stelle bei Möller.",
  "whatsapp.text.unternehmen": "Guten Tag, ich interessiere mich für Ihre Leistungen am PoS.",
  "whatsapp.text.allgemein": "Hallo, ich habe eine Frage an die Möller GmbH.",
  "regions.bundeslandMapping": {
    NRW: "NRW",
    HESSEN: "HESSEN",
    RHEINLAND_PFALZ: "HESSEN",
    BAYERN: "BAYERN",
  },
  "notifications.applicationRecipients": ["bewerbung@bvg-moeller.de"],
  "notifications.referralRecipients": ["bewerbung@bvg-moeller.de"],
  "notifications.chatRecipients": ["info@bvg-moeller.de"],
  "chat.reNotifyAfterMinutes": 30,
  "retention.rejectedApplicationsDays": 180,
  "retention.completedApplicationsDays": 730,
  "retention.chatDays": 180,
  "retention.referralDays": 365,
  "retention.rateLimitHours": 24,
  "features.referencesPage": false,
  "features.faqPage": false,
  "features.teamSection": true,
  "features.referralIncentives": false,
  "features.analytics": false,
  "security.mfaRequiredForAdmins": true,
  "academy.invitationValidityDays": 30,
  "academy.passScorePct": 80,
  "academy.reminders.enabled": false,
  "academy.reminders.notStartedAfterDays": 7,
  "academy.reminders.notCompletedAfterDays": 14,
  "applications.consentVersion": "2026-09-v1",
  "applications.consentText":
    "Ich habe die Datenschutzhinweise gelesen und bin damit einverstanden, dass die Möller GmbH meine Angaben zur Bearbeitung meiner Bewerbung verarbeitet.",
  "referrals.consentVersion": "2026-09-v1",
  "referrals.consentText":
    "Ich bestätige, dass die empfohlene Person damit einverstanden ist, dass die Möller GmbH ihre Kontaktdaten erhält und sie zu beruflichen Möglichkeiten kontaktieren darf.",
};

type SettingKey = keyof SettingDefs;

const cache = new Map<string, { value: unknown; loadedAt: number }>();
const CACHE_TTL_MS = 10_000;

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingDefs[K]> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.value as SettingDefs[K];
  try {
    const row = await db.systemSetting.findUnique({ where: { key } });
    const value = (row?.value as SettingDefs[K] | undefined) ?? SETTING_DEFAULTS[key];
    cache.set(key, { value, loadedAt: Date.now() });
    return value;
  } catch {
    // DB nicht erreichbar (z. B. Build ohne DB): sicherer Default
    return SETTING_DEFAULTS[key];
  }
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingDefs[K],
  updatedBy?: string,
): Promise<void> {
  await db.systemSetting.upsert({
    where: { key },
    update: { value: value as object, updatedBy },
    create: { key, value: value as object, updatedBy },
  });
  cache.delete(key);
}

export function clearSettingsCache(): void {
  cache.clear();
}

/** Sind wir gerade innerhalb der Geschäftszeiten? (Europe/Berlin) */
export async function isWithinBusinessHours(now = new Date()): Promise<boolean> {
  const hours = await getSetting("contact.openingHours");
  const berlin = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const weekdayMap: Record<string, number> = { Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5, Sa: 6, So: 7 };
  const wd = weekdayMap[berlin.find((p) => p.type === "weekday")?.value ?? ""] ?? 0;
  const hh = berlin.find((p) => p.type === "hour")?.value ?? "00";
  const mm = berlin.find((p) => p.type === "minute")?.value ?? "00";
  const current = `${hh}:${mm}`;
  if (!hours.days.includes(wd)) return false;
  return hours.windows.some((w) => current >= w.from && current < w.to);
}
