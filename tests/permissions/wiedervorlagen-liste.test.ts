import { describe, it, expect, vi } from "vitest";
import { db } from "@/lib/db";
import { applicationScope } from "@/lib/rbac";
import { createRegions, createUser, asCurrentUser, createCandidateWithApplication, TEAMLEITER_PERMS, INNENDIENST_PERMS, ADMIN_PERMS } from "../factory";

/**
 * Regression für den RC-P1 „Wiedervorlagen-Übersicht leer für Admin/Innendienst":
 * `applicationScope()` liefert bei candidates.read.all das leere Objekt {}.
 * Als Kurzform-Relationsfilter (`application: {}`) entfernt Prisma es ersatzlos,
 * wodurch der OR-Zweig für bewerbungsgebundene Wiedervorlagen entfiel. Der Fix
 * erzwingt mit `application: { is: scope }` die Relations-Semantik.
 *
 * Getestet wird die ECHTE Seite (Server Component) mit realer DB und realem
 * RBAC – nur die Cookie-Session ist wie in operational-lock.test.ts ersetzt.
 */

type FakeSession = Record<string, unknown> & { user: Record<string, unknown> };
const sessionState: { current: FakeSession | null } = { current: null };

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...mod,
    getSession: vi.fn(async () => sessionState.current),
  };
});

function fakeSession(
  user: { id: string; email: string; name: string; regionId?: string | null },
  opts: { roleKey: string; permissions: string[]; regionKey?: string | null },
): FakeSession {
  return {
    id: "sess-wv-test",
    userId: user.id,
    mfaPending: false,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 3_600_000),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: "x",
      active: true,
      regionId: user.regionId ?? null,
      region: opts.regionKey ? { key: opts.regionKey } : null,
      mustChangePassword: false,
      // Admin-Konten mit MFA, damit keine Betriebssperre greift (die ist
      // separat getestet und hier nicht Gegenstand).
      mfaEnabledAt: new Date(),
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

/** Sammelt alle Textinhalte (Kinder + String-Props) aus einem JSX-Baum. */
function collectText(node: unknown, out: string[], seen: Set<object>): void {
  if (typeof node === "string") {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out, seen);
    return;
  }
  if (node && typeof node === "object") {
    if (seen.has(node)) return;
    seen.add(node);
    const props = (node as { props?: Record<string, unknown> }).props;
    if (props) for (const value of Object.values(props)) collectText(value, out, seen);
  }
}

/** Rendert die echte Wiedervorlagen-Seite und liefert ihren sichtbaren Text. */
async function renderList(filter?: string): Promise<string> {
  vi.resetModules();
  const mod = await import("@/app/admin/(app)/wiedervorlagen/page");
  const jsx = await mod.default({ searchParams: Promise.resolve(filter ? { filter } : {}) });
  const out: string[] = [];
  collectText(jsx, out, new Set());
  return out.join("|");
}

function at(hourOffsetDays: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + hourOffsetDays);
  return d;
}

async function setupWorld() {
  const regions = await createRegions();
  const admin = await createUser({ name: "Admin Test" });
  const innendienst = await createUser({ name: "Innendienst Test" });
  const tlHessen = await createUser({ name: "TL Hessen", regionId: regions.hessen.id });
  const tlBayern = await createUser({ name: "TL Bayern", regionId: regions.bayern.id });

  const hessenFall = await createCandidateWithApplication({ bundesland: "HESSEN", regionId: regions.hessen.id, lastName: "HessenFall" });
  const nrwFall = await createCandidateWithApplication({ bundesland: "NRW", regionId: regions.nrw.id, lastName: "NrwFall" });

  const mkReminder = (data: {
    subject: string;
    dueDate: Date;
    applicationId?: string;
    candidateId?: string;
    assigneeId: string;
    done?: boolean;
  }) =>
    db.reminder.create({
      data: {
        subject: data.subject,
        dueDate: data.dueDate,
        applicationId: data.applicationId ?? null,
        candidateId: data.candidateId ?? null,
        assigneeId: data.assigneeId,
        done: data.done ?? false,
      },
    });

  await mkReminder({ subject: "WV-Heute-Hessen", dueDate: at(0), applicationId: hessenFall.application.id, candidateId: hessenFall.candidate.id, assigneeId: innendienst.id });
  await mkReminder({ subject: "WV-Ueberfaellig-Hessen", dueDate: at(-1), applicationId: hessenFall.application.id, candidateId: hessenFall.candidate.id, assigneeId: innendienst.id });
  await mkReminder({ subject: "WV-Kommend-NRW", dueDate: at(3), applicationId: nrwFall.application.id, candidateId: nrwFall.candidate.id, assigneeId: innendienst.id });
  await mkReminder({ subject: "WV-OhneBewerbung-TLH", dueDate: at(0), assigneeId: tlHessen.id });
  await mkReminder({ subject: "WV-Erledigt-Hessen", dueDate: at(0), applicationId: hessenFall.application.id, candidateId: hessenFall.candidate.id, assigneeId: innendienst.id, done: true });

  return { regions, admin, innendienst, tlHessen, tlBayern, hessenFall, nrwFall };
}

describe("Wiedervorlagen-Übersicht: Scope & Tabs (Regression RC-P1)", () => {
  it("1+9) Administrator sieht bewerbungsgebundene offene Wiedervorlagen; erledigte nicht", async () => {
    const w = await setupWorld();
    sessionState.current = fakeSession(w.admin, { roleKey: "ADMINISTRATOR", permissions: ADMIN_PERMS });
    const html = await renderList();
    expect(html).toContain("WV-Heute-Hessen");
    expect(html).toContain("WV-Ueberfaellig-Hessen");
    expect(html).toContain("WV-Kommend-NRW");
    // F) bewerbungslose Wiedervorlage für read.all sichtbar (unabhängig vom Assignee)
    expect(html).toContain("WV-OhneBewerbung-TLH");
    // G/9) erledigte erscheint nicht wieder als offen
    expect(html).not.toContain("WV-Erledigt-Hessen");
  });

  it("2) Innendienst sieht bewerbungsgebundene offene Wiedervorlagen aller Regionen", async () => {
    const w = await setupWorld();
    sessionState.current = fakeSession(w.innendienst, { roleKey: "INNENDIENST", permissions: INNENDIENST_PERMS });
    const html = await renderList();
    expect(html).toContain("WV-Heute-Hessen");
    expect(html).toContain("WV-Kommend-NRW");
    expect(html).not.toContain("WV-Erledigt-Hessen");
  });

  it("3+4+F) Teamleiter: eigene Region sichtbar, fremde Region nicht; bewerbungslose nur als Assignee", async () => {
    const w = await setupWorld();
    sessionState.current = fakeSession(w.tlHessen, { roleKey: "TEAMLEITER", permissions: TEAMLEITER_PERMS, regionKey: "HESSEN" });
    const html = await renderList();
    expect(html).toContain("WV-Heute-Hessen");
    expect(html).toContain("WV-Ueberfaellig-Hessen");
    expect(html).not.toContain("WV-Kommend-NRW"); // E) fremde Region
    expect(html).toContain("WV-OhneBewerbung-TLH"); // F) eigener Assignee
  });

  it("5) Teamleiter mit aktiver Vertretung sieht die vertretene Region zusätzlich", async () => {
    const w = await setupWorld();
    sessionState.current = fakeSession(w.tlBayern, { roleKey: "TEAMLEITER", permissions: TEAMLEITER_PERMS, regionKey: "BAYERN" });
    const before = await renderList();
    expect(before).not.toContain("WV-Heute-Hessen");
    expect(before).not.toContain("WV-OhneBewerbung-TLH"); // fremder Assignee bleibt unsichtbar

    await db.teamLeadDelegation.create({
      data: {
        fromUserId: w.tlHessen.id,
        toUserId: w.tlBayern.id,
        startsAt: new Date(Date.now() - 3_600_000),
        endsAt: new Date(Date.now() + 86_400_000),
      },
    });
    const during = await renderList();
    expect(during).toContain("WV-Heute-Hessen"); // D) via Vertretung
    expect(during).not.toContain("WV-Kommend-NRW"); // E) weiterhin keine fremde Dritt-Region
    expect(during).not.toContain("WV-OhneBewerbung-TLH"); // bewerbungslos bleibt an den Assignee gebunden
  });

  it("6+7+8) Tabs Heute/Überfällig/Kommend filtern die Zeitbereiche eindeutig (Admin)", async () => {
    const w = await setupWorld();
    sessionState.current = fakeSession(w.admin, { roleKey: "ADMINISTRATOR", permissions: ADMIN_PERMS });

    const heute = await renderList("heute");
    expect(heute).toContain("WV-Heute-Hessen");
    expect(heute).not.toContain("WV-Ueberfaellig-Hessen");
    expect(heute).not.toContain("WV-Kommend-NRW");

    const ueberfaellig = await renderList("ueberfaellig");
    expect(ueberfaellig).toContain("WV-Ueberfaellig-Hessen");
    expect(ueberfaellig).not.toContain("WV-Heute-Hessen");
    expect(ueberfaellig).not.toContain("WV-Kommend-NRW");

    const kommend = await renderList("kommend");
    expect(kommend).toContain("WV-Kommend-NRW");
    expect(kommend).not.toContain("WV-Heute-Hessen");
    expect(kommend).not.toContain("WV-Ueberfaellig-Hessen");
  });

  it("10) Dashboard-Zähler und Listeneinträge sind konsistent (Admin und Teamleiter)", async () => {
    const w = await setupWorld();
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

    // Admin: Kachel-Query der Dashboard-Seite (application: {}) zählt alle –
    // die Liste zeigt nach dem Fix ebenfalls alle → identische Mengen.
    const adminUser = asCurrentUser(w.admin, ADMIN_PERMS);
    const adminScope = await applicationScope(adminUser);
    const [adminHeute, adminUeber] = await Promise.all([
      db.reminder.count({ where: { done: false, dueDate: { gte: startOfDay, lt: endOfDay }, application: adminScope } }),
      db.reminder.count({ where: { done: false, dueDate: { lt: startOfDay }, application: adminScope } }),
    ]);
    expect(adminHeute).toBe(2); // WV-Heute-Hessen + WV-OhneBewerbung-TLH
    expect(adminUeber).toBe(1); // WV-Ueberfaellig-Hessen
    sessionState.current = fakeSession(w.admin, { roleKey: "ADMINISTRATOR", permissions: ADMIN_PERMS });
    const adminHeuteListe = await renderList("heute");
    expect(adminHeuteListe).toContain("WV-Heute-Hessen");
    expect(adminHeuteListe).toContain("WV-OhneBewerbung-TLH");
    const adminUeberListe = await renderList("ueberfaellig");
    expect(adminUeberListe).toContain("WV-Ueberfaellig-Hessen");

    // Teamleiter Hessen: gezählte bewerbungsgebundene Wiedervorlagen erscheinen in der Liste.
    const tlUser = asCurrentUser(w.tlHessen, TEAMLEITER_PERMS, "HESSEN");
    const tlScope = await applicationScope(tlUser);
    const tlUeber = await db.reminder.count({ where: { done: false, dueDate: { lt: startOfDay }, application: tlScope } });
    expect(tlUeber).toBe(1);
    sessionState.current = fakeSession(w.tlHessen, { roleKey: "TEAMLEITER", permissions: TEAMLEITER_PERMS, regionKey: "HESSEN" });
    const tlUeberListe = await renderList("ueberfaellig");
    expect(tlUeberListe).toContain("WV-Ueberfaellig-Hessen");
  });
});
