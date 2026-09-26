import type { Bundesland } from "@prisma/client";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Telefonnummern auf vergleichbare Form bringen (Duplikaterkennung). */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (digits.startsWith("0")) digits = `+49${digits.slice(1)}`;
  if (!digits.startsWith("+")) digits = `+49${digits}`;
  return digits;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const BUNDESLAND_LABEL: Record<Bundesland, string> = {
  NRW: "Nordrhein-Westfalen",
  HESSEN: "Hessen",
  RHEINLAND_PFALZ: "Rheinland-Pfalz",
  BAYERN: "Bayern",
};

export const BUNDESLAND_KURZ: Record<Bundesland, string> = {
  NRW: "NRW",
  HESSEN: "Hessen",
  RHEINLAND_PFALZ: "Rheinland-Pfalz",
  BAYERN: "Bayern",
};

export const ALL_BUNDESLAENDER: Bundesland[] = ["NRW", "HESSEN", "RHEINLAND_PFALZ", "BAYERN"];

/**
 * Offline-Näherung: PLZ-Leitzonen → Bundesland (nur Einsatzregionen).
 * Bewusst grob – dient dem Jobfinder („Möller in Deiner Nähe") ohne externen Geocoder.
 */
export function plzToBundesland(plz: string): Bundesland | null {
  const p = plz.trim();
  if (!/^\d{5}$/.test(p)) return null;
  const n = Number(p.slice(0, 2));
  // NRW
  if ((n >= 32 && n <= 33) || (n >= 40 && n <= 48) || (n >= 50 && n <= 53) || (n >= 57 && n <= 59)) return "NRW";
  // Hessen
  if ((n >= 34 && n <= 36) || n === 60 || n === 61 || n === 63 || n === 64 || n === 65 || n === 68) return "HESSEN";
  // Rheinland-Pfalz
  if (n === 54 || n === 55 || n === 56 || n === 66 || n === 67 || n === 76) return "RHEINLAND_PFALZ";
  // Bayern (63xxx ist geteilt Hessen/Bayern; oben bereits Hessen zugeordnet)
  if ((n >= 80 && n <= 87) || (n >= 90 && n <= 97)) return "BAYERN";
  return null;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "–";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "–";
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}, ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Initialen für Avatar-Fallbacks. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
