import { db } from "@/lib/db";
import type { Bundesland } from "@prisma/client";
import type { CurrentUser } from "@/lib/rbac";

/** Test-Fabriken: minimale, sprechende Datensätze für Integrationstests. */

export async function createRegions() {
  const [nrw, hessen, bayern] = await Promise.all([
    db.region.create({ data: { key: "NRW", name: "Team NRW" } }),
    db.region.create({ data: { key: "HESSEN", name: "Team Hessen" } }),
    db.region.create({ data: { key: "BAYERN", name: "Team Bayern" } }),
  ]);
  return { nrw, hessen, bayern };
}

let userCounter = 0;

export async function createUser(params: { name: string; regionId?: string | null }) {
  userCounter++;
  return db.user.create({
    data: {
      email: `test-${userCounter}-${Math.random().toString(36).slice(2, 8)}@test.local`,
      name: params.name,
      passwordHash: "x",
      regionId: params.regionId ?? null,
    },
  });
}

/** CurrentUser-Objekt bauen (RBAC-Funktionen arbeiten auf dieser Struktur). */
export function asCurrentUser(
  user: { id: string; email: string; name: string; regionId: string | null },
  permissions: string[],
  regionKey: string | null = null,
): CurrentUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    regionId: user.regionId,
    regionKey,
    roleKeys: [],
    permissions: new Set(permissions),
    mfaEnabled: false,
    mustChangePassword: false,
  };
}

export const TEAMLEITER_PERMS = ["candidates.read.regional", "candidates.write", "academy.viewRegional", "delegations.self"];
export const INNENDIENST_PERMS = [
  "candidates.read.all",
  "candidates.write",
  "candidates.assign",
  "jobs.manage",
  "referrals.manage",
  "chat.manage",
  "academy.manageParticipants",
  "delegations.manage",
  "delegations.self",
];
export const ADMIN_PERMS = [...INNENDIENST_PERMS, "cms.editContent", "cms.publish", "users.manage", "settings.manage", "privacy.manage", "academy.editContent"];

export async function createCandidateWithApplication(params: {
  bundesland: Bundesland;
  regionId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  createdAt?: Date;
  manualStatus?: "ZUSAGE" | "ABSAGE";
  assignedUserId?: string;
}) {
  userCounter++;
  const candidate = await db.candidate.create({
    data: {
      firstName: params.firstName ?? "Test",
      lastName: params.lastName ?? `Person${userCounter}`,
      email: params.email ?? `kandidat-${userCounter}@test.local`,
      emailNormalized: params.email ?? `kandidat-${userCounter}@test.local`,
      phone: `+4917000${String(userCounter).padStart(4, "0")}`,
      phoneNormalized: `+4917000${String(userCounter).padStart(4, "0")}`,
      city: "Teststadt",
      bundesland: params.bundesland,
    },
  });
  const application = await db.application.create({
    data: {
      candidateId: candidate.id,
      type: "INITIATIV",
      bundesland: params.bundesland,
      city: "Teststadt",
      driversLicense: true,
      previousActivity: "Test",
      availableFrom: "sofort",
      responsibleRegionId: params.regionId,
      consentVersion: "test",
      manualStatus: params.manualStatus ?? null,
      assignedUserId: params.assignedUserId,
      ...(params.createdAt ? { createdAt: params.createdAt, statusChangedAt: params.createdAt } : {}),
    },
  });
  return { candidate, application };
}
