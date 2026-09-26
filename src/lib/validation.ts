import { z } from "zod";

/** Serverseitige Validierung öffentlicher Formulare (Masterprompt §15, §23). */

export const bundeslandEnum = z.enum(["NRW", "HESSEN", "RHEINLAND_PFALZ", "BAYERN"]);

export const applicationSchema = z.object({
  jobSlug: z.string().max(120).optional(),
  firstName: z.string().trim().min(2, "Bitte gib Deinen Vornamen an.").max(80),
  lastName: z.string().trim().min(2, "Bitte gib Deinen Nachnamen an.").max(80),
  city: z.string().trim().min(2, "Bitte gib Deinen Wohnort an.").max(120),
  bundesland: bundeslandEnum,
  driversLicense: z.enum(["ja", "nein"]),
  ownCar: z.enum(["ja", "nein"]).optional(),
  previousActivity: z.string().trim().min(2, "Bitte beschreib kurz Deine bisherige Tätigkeit.").max(300),
  availableFrom: z.string().trim().min(2, "Bitte sag uns, ab wann Du verfügbar bist.").max(60),
  phone: z
    .string()
    .trim()
    .min(6, "Bitte gib Deine Telefonnummer an.")
    .max(30)
    .regex(/^[+\d][\d\s\-/()]+$/, "Bitte gib eine gültige Telefonnummer an."),
  email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse an.").max(200),
  message: z.string().trim().max(1000).optional(),
  consent: z.literal("on", { error: "Bitte bestätige die Datenschutzhinweise." }),
  // Anti-Spam
  website: z.string().max(0).optional(), // Honeypot
  startedAt: z.string().optional(), // Zeitfalle
  // Kampagnen
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

export const referralLinkSchema = z.object({
  referrerFirstName: z.string().trim().min(2, "Bitte gib Deinen Vornamen an.").max(80),
  referrerLastName: z.string().trim().min(2, "Bitte gib Deinen Nachnamen an.").max(80),
  referrerContact: z.string().trim().min(5, "Bitte gib Telefon oder E-Mail an.").max(200),
  referrerEmployeeNo: z.string().trim().max(40).optional(),
  website: z.string().max(0).optional(),
});

export const referralDirectSchema = z.object({
  referrerFirstName: z.string().trim().min(2, "Bitte gib Deinen Vornamen an.").max(80),
  referrerLastName: z.string().trim().min(2, "Bitte gib Deinen Nachnamen an.").max(80),
  referrerContact: z.string().trim().min(5, "Bitte gib Telefon oder E-Mail an.").max(200),
  referrerEmployeeNo: z.string().trim().max(40).optional(),
  referredFirstName: z.string().trim().min(2, "Bitte gib den Vornamen an.").max(80),
  referredLastName: z.string().trim().min(2, "Bitte gib den Nachnamen an.").max(80),
  referredPhone: z.string().trim().min(6, "Bitte gib die Telefonnummer an.").max(30),
  referredEmail: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse an.").max(200),
  referredCity: z.string().trim().min(2, "Bitte gib den Wohnort an.").max(120),
  referredBundesland: bundeslandEnum,
  note: z.string().trim().max(500).optional(),
  consent: z.literal("on", { error: "Ohne Einverständnis der empfohlenen Person dürfen wir ihre Daten nicht annehmen." }),
  website: z.string().max(0).optional(),
});

export const referralSelfSchema = z.object({
  code: z.string().trim().min(4).max(20),
  firstName: z.string().trim().min(2, "Bitte gib Deinen Vornamen an.").max(80),
  lastName: z.string().trim().min(2, "Bitte gib Deinen Nachnamen an.").max(80),
  phone: z.string().trim().min(6, "Bitte gib Deine Telefonnummer an.").max(30),
  email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse an.").max(200),
  city: z.string().trim().min(2, "Bitte gib Deinen Wohnort an.").max(120),
  bundesland: bundeslandEnum,
  note: z.string().trim().max(500).optional(),
  website: z.string().max(0).optional(),
});

/** Zeitfalle: Formular schneller als 3 Sekunden ausgefüllt → sehr wahrscheinlich Bot. */
export function tooFast(startedAt: string | undefined): boolean {
  if (!startedAt) return false;
  const t = Number(startedAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 3000;
}
