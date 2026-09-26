import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import type { Bundesland, Prisma } from "@prisma/client";
import { getSetting } from "@/lib/settings";

// ============================================================
// Permission-Katalog (Seeds legen diese an; Rollen sind DB-Daten)
// ============================================================

export const PERMISSIONS = {
  // Bewerber
  "candidates.read.all": "Alle Bewerber sehen",
  "candidates.read.regional": "Bewerber der eigenen Region sehen",
  "candidates.write": "Bewerber bearbeiten (Status, Notizen, Wiedervorlagen)",
  "candidates.assign": "Bewerber umzuordnen",
  "candidates.export": "Bewerberdaten exportieren",
  "candidates.delete": "Bewerber löschen/anonymisieren",
  // Stellen
  "jobs.manage": "Stellen erstellen, bearbeiten, veröffentlichen",
  // Empfehlungen
  "referrals.manage": "Empfehlungen bearbeiten",
  // Chat
  "chat.manage": "Chats bearbeiten",
  // CMS
  "cms.editContent": "Website-Inhalte bearbeiten",
  "cms.publish": "Website-Inhalte veröffentlichen",
  "media.manage": "Medienbibliothek verwalten",
  // Academy
  "academy.manageParticipants": "Academy-Teilnehmer verwalten",
  "academy.editContent": "Academy-Inhalte bearbeiten",
  "academy.viewRegional": "Academy-Fortschritt der eigenen Region sehen",
  // Verwaltung
  "users.manage": "Benutzer & Rollen verwalten",
  "settings.manage": "Systemeinstellungen ändern",
  "delegations.manage": "Vertretungen für andere anlegen/ändern/beenden",
  "delegations.self": "Eigene Vertretung anlegen",
  "reporting.view": "Reporting einsehen",
  "reporting.export": "Reporting exportieren",
  "audit.view": "Audit-Log einsehen",
  "privacy.manage": "Datenschutz-Werkzeuge (Retention, Export, Löschung)",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

// ============================================================
// Aktueller Benutzer
// ============================================================

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  regionId: string | null;
  regionKey: string | null;
  roleKeys: string[];
  permissions: Set<string>;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
};

/**
 * Konto-Identität OHNE Betriebssperre: nur für die Flows, die nötig sind, um
 * einen gesperrten Zustand zu VERLASSEN (Passwort ändern, MFA einrichten,
 * „Mein Konto“-Seite, Logout, Layout-Anzeige). Operative Actions/Routen
 * benutzen ausschließlich getCurrentUser() bzw. assertPermission().
 */
export const getSessionUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session || session.mfaPending) return null;
  const u = session.user;
  const permissions = new Set<string>();
  const roleKeys: string[] = [];
  for (const ur of u.roles) {
    roleKeys.push(ur.role.key);
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    regionId: u.regionId,
    regionKey: u.region?.key ?? null,
    roleKeys,
    permissions,
    mfaEnabled: Boolean(u.mfaEnabledAt),
    mustChangePassword: u.mustChangePassword,
  };
});

export type OperationalLock = "PASSWORT_WECHSEL" | "MFA_EINRICHTUNG" | null;

/**
 * Betriebssperre: Ein Benutzer mit erzwungenem Passwortwechsel oder ein
 * Administrator ohne eingerichtete Pflicht-MFA darf KEINE operativen
 * Funktionen ausführen – unabhängig davon, welche Seite die UI anzeigt.
 */
export async function getOperationalLock(user: CurrentUser): Promise<OperationalLock> {
  if (user.mustChangePassword) return "PASSWORT_WECHSEL";
  if (!user.mfaEnabled && user.roleKeys.includes("ADMINISTRATOR")) {
    if (await getSetting("security.mfaRequiredForAdmins")) return "MFA_EINRICHTUNG";
  }
  return null;
}

/**
 * Operativer Benutzer: DIE zentrale Autorisierungsgrenze für sämtliche
 * Server Actions und geschützten Route Handler. Liefert null (fail closed),
 * solange eine Betriebssperre aktiv ist – die MFA-Pflicht ist damit kein
 * reines UI-/Layout-Gate, sondern gilt an der Action-/API-Grenze.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  if (await getOperationalLock(user)) return null;
  return user;
});

export function hasPermission(user: CurrentUser, permission: PermissionKey): boolean {
  return user.permissions.has(permission);
}

/** Für Layouts/Pages: leitet zum Login bzw. zum Entsperr-Schritt um. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  const lock = await getOperationalLock(user);
  if (lock === "PASSWORT_WECHSEL") redirect("/admin/passwort-aendern");
  if (lock === "MFA_EINRICHTUNG") redirect("/admin/sicherheit?pflicht=1");
  return user;
}

export async function requirePermission(permission: PermissionKey): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasPermission(user, permission)) redirect("/admin?fehler=berechtigung");
  return user;
}

/** Für Route Handler / Services: wirft statt umzuleiten. */
export class ForbiddenError extends Error {
  constructor(message = "Keine Berechtigung") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function assertPermission(permission: PermissionKey): Promise<CurrentUser> {
  const user = await getSessionUser();
  if (!user) throw new ForbiddenError("Nicht angemeldet");
  const lock = await getOperationalLock(user);
  if (lock === "PASSWORT_WECHSEL") throw new ForbiddenError("Bitte zuerst das Startpasswort ändern.");
  if (lock === "MFA_EINRICHTUNG") throw new ForbiddenError("Bitte zuerst die Zwei-Faktor-Anmeldung einrichten.");
  if (!hasPermission(user, permission)) throw new ForbiddenError();
  return user;
}

// ============================================================
// Regions-Scope (Teamleiter, Vertretungen)
// ============================================================

/**
 * Wirksame Regionen eines Benutzers: eigene Region + aktive Vertretungen.
 * Vertretungen vererben sich NICHT transitiv: nur direkte, aktuell laufende
 * Delegationen des vertretenen Teamleiters zählen – und nur dessen EIGENE Region.
 */
export async function getEffectiveRegionIds(user: CurrentUser, now = new Date()): Promise<string[]> {
  const ids = new Set<string>();
  if (user.regionId) ids.add(user.regionId);
  const delegations = await db.teamLeadDelegation.findMany({
    where: {
      toUserId: user.id,
      cancelledAt: null,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    include: { fromUser: { select: { regionId: true } } },
  });
  for (const d of delegations) {
    if (d.fromUser.regionId) ids.add(d.fromUser.regionId);
  }
  return [...ids];
}

/**
 * Prisma-WHERE-Fragment für Bewerbungen, die der Benutzer sehen darf.
 * - candidates.read.all → alles
 * - candidates.read.regional → wirksame Regionen ODER explizit zugewiesen
 */
export async function applicationScope(user: CurrentUser): Promise<Prisma.ApplicationWhereInput> {
  if (hasPermission(user, "candidates.read.all")) return {};
  if (hasPermission(user, "candidates.read.regional")) {
    const regionIds = await getEffectiveRegionIds(user);
    return {
      OR: [
        { responsibleRegionId: { in: regionIds.length ? regionIds : ["__none__"] } },
        { assignedUserId: user.id },
      ],
    };
  }
  return { id: "__none__" }; // niemals treffen
}

/** Objektprüfung: darf der Benutzer diese Bewerbung sehen? */
export async function canAccessApplication(
  user: CurrentUser,
  application: { responsibleRegionId: string; assignedUserId: string | null },
): Promise<boolean> {
  if (hasPermission(user, "candidates.read.all")) return true;
  if (!hasPermission(user, "candidates.read.regional")) return false;
  if (application.assignedUserId === user.id) return true;
  const regionIds = await getEffectiveRegionIds(user);
  return regionIds.includes(application.responsibleRegionId);
}

/** Bewerber-Scope: sichtbar, wenn mindestens eine Bewerbung sichtbar ist. */
export async function candidateScope(user: CurrentUser): Promise<Prisma.CandidateWhereInput> {
  if (hasPermission(user, "candidates.read.all")) return {};
  const appScope = await applicationScope(user);
  return { applications: { some: appScope } };
}

/** Verantwortliche Team-Region für ein Bundesland (konfigurierbar; RLP→Hessen). */
export async function regionForBundesland(bundesland: Bundesland): Promise<string> {
  const mapping = await getSetting("regions.bundeslandMapping");
  const regionKey = mapping[bundesland];
  const region = await db.region.findUnique({ where: { key: regionKey } });
  if (!region) throw new Error(`Region ${regionKey} fehlt (Seed nicht ausgeführt?)`);
  return region.id;
}
