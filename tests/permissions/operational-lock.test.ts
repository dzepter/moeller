import { describe, it, expect, beforeEach, vi } from "vitest";
import { hash } from "@node-rs/argon2";
import { db } from "@/lib/db";
import { createUser } from "../factory";

/**
 * Punkt 1 (P1): Die MFA-/First-Login-Pflicht ist KEIN UI-Gate, sondern gilt
 * zentral an der Action-/API-Grenze (getCurrentUser/assertPermission liefern
 * fail-closed null/Forbidden, solange eine Betriebssperre aktiv ist).
 * Diese Tests rufen ECHTE Server Actions und einen echten Route Handler auf –
 * die Autorisierung selbst wird nicht gemockt, nur die Cookie-Session wird
 * durch eine konstruierte Session ersetzt.
 */

type FakeSession = Record<string, unknown> & { user: Record<string, unknown> };
const sessionState: { current: FakeSession | null } = { current: null };

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...mod,
    getSession: vi.fn(async () => sessionState.current),
    revokeAllSessions: vi.fn(async () => undefined),
  };
});

function fakeSession(
  user: { id: string; email: string; name: string; passwordHash?: string },
  opts: { roleKey: string; permissions: string[]; mfaEnabledAt: Date | null; mustChangePassword: boolean },
): FakeSession {
  return {
    id: "sess-test",
    userId: user.id,
    mfaPending: false,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 3_600_000),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash ?? "x",
      active: true,
      regionId: null,
      region: null,
      mustChangePassword: opts.mustChangePassword,
      mfaEnabledAt: opts.mfaEnabledAt,
      roles: [
        {
          role: {
            key: opts.roleKey,
            permissions: opts.permissions.map((key) => ({ permission: { key } })),
          },
        },
      ],
    },
  };
}

const ADMIN_PERMS = ["settings.manage", "users.manage", "cms.editContent", "cms.publish", "reporting.export", "candidates.write", "candidates.read.all"];

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

// Frische Module pro Test: getSessionUser/getCurrentUser sind react-cache-
// gewrappt; resetModules verhindert Memoisation über Szenariogrenzen.
async function loadWorld() {
  vi.resetModules();
  const settings = await import("@/app/actions/admin-settings");
  const users = await import("@/app/actions/admin-users");
  const cms = await import("@/app/actions/admin-cms");
  const auth = await import("@/app/actions/auth");
  const reporting = await import("@/app/api/admin/reporting/export/route");
  const rbac = await import("@/lib/rbac");
  return { settings, users, cms, auth, reporting, rbac };
}

beforeEach(() => {
  sessionState.current = null;
});

describe("Betriebssperre an der Action-/API-Grenze", () => {
  it("A: Admin ohne eingerichtete Pflicht-MFA – operative Actions werden serverseitig abgelehnt", async () => {
    const user = await createUser({ name: "Admin ohne MFA" });
    sessionState.current = fakeSession(user, {
      roleKey: "ADMINISTRATOR",
      permissions: ADMIN_PERMS,
      mfaEnabledAt: null, // MFA-Pflicht (Default true) greift
      mustChangePassword: false,
    });
    const { settings, users, cms, reporting } = await loadWorld();

    const s = await settings.saveSettingsAction(null, form({ section: "kontakt", phone: "0000", email: "x@x.de", applicationEmail: "x@x.de", whatsappNumber: "1", company: "X", street: "X", zip: "1", city: "X", hoursFrom: "08:00", hoursTo: "17:00", hoursLabel: "X" }));
    expect(s?.error).toBeTruthy();
    expect(await db.systemSetting.findUnique({ where: { key: "contact.phone" } })).toBeNull();

    const before = await db.user.count();
    const u = await users.createUserAction(null, form({ name: "Neu", email: "neu@test.local", roleId: "egal", password: "Passwort123!x" }));
    expect(u?.error).toBeTruthy();
    expect(await db.user.count()).toBe(before);

    const c = await cms.saveCmsDraftAction(null, form({ slug: "home" }));
    expect(c?.error).toBeTruthy();
    expect(await db.cmsRevision.count()).toBe(0);

    // Auch Route Handler (API-Grenze), nicht nur Server Actions:
    const res = await reporting.GET(new Request("http://test.local/api/admin/reporting/export"));
    expect(res.status).toBe(403);
  });

  it("B: derselbe gesperrte Admin darf die MFA-Einrichtung ausführen (Ausweg aus der Sperre)", async () => {
    const user = await createUser({ name: "Admin ohne MFA" });
    sessionState.current = fakeSession(user, {
      roleKey: "ADMINISTRATOR",
      permissions: ADMIN_PERMS,
      mfaEnabledAt: null,
      mustChangePassword: false,
    });
    const { auth } = await loadWorld();
    const setup = await auth.startMfaSetupAction();
    expect(setup?.manualCode).toBeTruthy();
    expect(setup?.otpAuthUrl).toContain("otpauth://");
  });

  it("C: Benutzer mit mustChangePassword darf keine operativen Actions ausführen", async () => {
    const user = await createUser({ name: "Frisch angelegt" });
    sessionState.current = fakeSession(user, {
      roleKey: "INNENDIENST",
      permissions: ADMIN_PERMS, // selbst mit (theoretisch) allen Rechten:
      mfaEnabledAt: new Date(),
      mustChangePassword: true, // → Sperre greift zuerst
    });
    const { settings, rbac } = await loadWorld();

    const s = await settings.saveSettingsAction(null, form({ section: "kontakt", phone: "0000", email: "x@x.de", applicationEmail: "x@x.de", whatsappNumber: "1", company: "X", street: "X", zip: "1", city: "X", hoursFrom: "08:00", hoursTo: "17:00", hoursLabel: "X" }));
    expect(s?.error).toBeTruthy();
    expect(await db.systemSetting.findUnique({ where: { key: "contact.phone" } })).toBeNull();

    await expect(rbac.assertPermission("settings.manage")).rejects.toThrow(/Startpasswort/);
  });

  it("D: die Passwortänderung selbst funktioniert im gesperrten Zustand weiterhin", async () => {
    const passwordHash = await hash("AltesPasswort1!", { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const user = await createUser({ name: "Frisch angelegt" });
    await db.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: true } });
    sessionState.current = fakeSession(
      { ...user, passwordHash },
      { roleKey: "INNENDIENST", permissions: [], mfaEnabledAt: null, mustChangePassword: true },
    );
    const { auth } = await loadWorld();

    await expect(
      auth.changePasswordAction(null, form({ currentPassword: "AltesPasswort1!", newPassword: "GanzNeu2026!x", confirm: "GanzNeu2026!x" })),
    ).rejects.toThrow(/REDIRECT:\/admin/); // Erfolg endet im Redirect
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.mustChangePassword).toBe(false);
    expect(after.passwordHash).not.toBe(passwordHash);
  });

  it("E: mit eingerichteter MFA (und ohne Passwort-Pflicht) laufen dieselben Actions normal", async () => {
    const user = await createUser({ name: "Admin mit MFA" });
    sessionState.current = fakeSession(user, {
      roleKey: "ADMINISTRATOR",
      permissions: ADMIN_PERMS,
      mfaEnabledAt: new Date(),
      mustChangePassword: false,
    });
    const { settings, reporting } = await loadWorld();

    const s = await settings.saveSettingsAction(null, form({ section: "kontakt", phone: "06725 / 919350", email: "info@bvg-moeller.de", applicationEmail: "bewerbung@bvg-moeller.de", whatsappNumber: "496725919350", company: "Möller GmbH", street: "Max-Planck-Str. 8", zip: "55435", city: "Gau-Algesheim", hoursFrom: "08:00", hoursTo: "17:00", hoursLabel: "Montag bis Freitag, 08:00–17:00 Uhr" }));
    expect(s?.ok).toBe(true);
    expect(await db.systemSetting.findUnique({ where: { key: "contact.phone" } })).not.toBeNull();

    const res = await reporting.GET(new Request("http://test.local/api/admin/reporting/export"));
    expect(res.status).toBe(200);
  });

  it("F: Nicht-Admin ohne MFA bleibt arbeitsfähig (Sperre gilt nur für Admin-Pflicht-MFA bzw. Passwortwechsel)", async () => {
    const user = await createUser({ name: "Jana" });
    sessionState.current = fakeSession(user, {
      roleKey: "INNENDIENST",
      permissions: ["settings.manage"],
      mfaEnabledAt: null,
      mustChangePassword: false,
    });
    const { rbac } = await loadWorld();
    const current = await rbac.getCurrentUser();
    expect(current?.id).toBe(user.id);
  });
});
