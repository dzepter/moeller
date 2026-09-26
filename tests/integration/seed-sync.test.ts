import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { syncSystemRoles, ensureBootstrapUser } from "../../prisma/seed";

/**
 * Punkt 3: Wiederholtes Seeding darf keine Privilegien ansammeln.
 * - Systemrollen werden EXAKT auf ROLE_PERMISSIONS synchronisiert
 *   (alte, nicht mehr vorgesehene Zuordnungen werden entfernt).
 * - Rollenmodell B: bestehende Benutzer werden vom Seed nicht verändert.
 */

const TEAMLEITER_EXPECTED = ["candidates.read.regional", "candidates.write", "academy.viewRegional", "delegations.self"].sort();

async function rolePerms(roleKey: string): Promise<string[]> {
  const role = await db.role.findUniqueOrThrow({
    where: { key: roleKey },
    include: { permissions: { include: { permission: true } } },
  });
  return role.permissions.map((rp) => rp.permission.key).sort();
}

describe("Seed: deterministische Systemrollen (keine Privilege Accumulation)", () => {
  it("entfernt alt-zugewiesene Permissions einer Systemrolle beim nächsten Sync", async () => {
    await syncSystemRoles(db);
    expect(await rolePerms("TEAMLEITER")).toEqual(TEAMLEITER_EXPECTED);

    // Alten Seed-Stand simulieren: TEAMLEITER hatte früher settings.manage
    const role = await db.role.findUniqueOrThrow({ where: { key: "TEAMLEITER" } });
    const rogue = await db.permission.findUniqueOrThrow({ where: { key: "settings.manage" } });
    await db.rolePermission.create({ data: { roleId: role.id, permissionId: rogue.id } });
    expect(await rolePerms("TEAMLEITER")).toContain("settings.manage");

    // Erneuter Sync: alte Permission ist weg, gewünschte vollständig da
    await syncSystemRoles(db);
    expect(await rolePerms("TEAMLEITER")).toEqual(TEAMLEITER_EXPECTED);
    // Idempotent
    await syncSystemRoles(db);
    expect(await rolePerms("TEAMLEITER")).toEqual(TEAMLEITER_EXPECTED);
  });

  it("Rollenmodell B: bestehende Benutzer werden vom Seed nicht verändert (weder Rollen noch Passwort)", async () => {
    await syncSystemRoles(db);
    const teamleiter = await db.role.findUniqueOrThrow({ where: { key: "TEAMLEITER" } });
    const existing = await db.user.create({
      data: {
        email: "bestand@test.local",
        name: "Bestand",
        passwordHash: "unverändert-hash",
        roles: { create: { roleId: teamleiter.id } },
      },
    });

    // Seed „möchte“ diesen Benutzer als INNENDIENST anlegen → darf NICHTS ändern
    const result = await ensureBootstrapUser(db, {
      email: "bestand@test.local",
      name: "Anders",
      roleKey: "INNENDIENST",
      password: "NeuesPasswort123!",
    });
    expect(result.created).toBe(false);

    const after = await db.user.findUniqueOrThrow({
      where: { id: existing.id },
      include: { roles: { include: { role: true } } },
    });
    expect(after.passwordHash).toBe("unverändert-hash");
    expect(after.name).toBe("Bestand");
    expect(after.roles.map((r) => r.role.key)).toEqual(["TEAMLEITER"]); // keine Rollen-Akkumulation

    // Neuanlage funktioniert weiterhin mit exakt einer Systemrolle
    const fresh = await ensureBootstrapUser(db, {
      email: "neu@test.local",
      name: "Neu",
      roleKey: "INNENDIENST",
      password: "Startpasswort123!",
    });
    expect(fresh.created).toBe(true);
    const created = await db.user.findUniqueOrThrow({
      where: { email: "neu@test.local" },
      include: { roles: { include: { role: true } } },
    });
    expect(created.roles.map((r) => r.role.key)).toEqual(["INNENDIENST"]);
    expect(created.mustChangePassword).toBe(true);
  });
});
