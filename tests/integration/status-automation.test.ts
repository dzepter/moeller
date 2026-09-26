import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { runStatusAutomation } from "@/server/jobs-scheduler";
import { createRegions, createCandidateWithApplication, createUser, asCurrentUser, INNENDIENST_PERMS } from "../factory";
import { changeStatus } from "@/server/candidates";

describe("Statusautomatik Neu → Offen (72h)", () => {
  it("setzt Bewerbungen älter als 72h auf OFFEN", async () => {
    const { nrw } = await createRegions();
    const old = await createCandidateWithApplication({
      bundesland: "NRW",
      regionId: nrw.id,
      createdAt: new Date(Date.now() - 73 * 3600 * 1000),
    });
    const fresh = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id });

    const result = await runStatusAutomation();
    expect(result.moved).toBe(1);

    const oldApp = await db.application.findUniqueOrThrow({ where: { id: old.application.id } });
    const freshApp = await db.application.findUniqueOrThrow({ where: { id: fresh.application.id } });
    expect(oldApp.autoStatus).toBe("OFFEN");
    expect(freshApp.autoStatus).toBe("NEU");

    // Historie wurde geschrieben
    const history = await db.applicationStatusHistory.findMany({ where: { applicationId: old.application.id } });
    expect(history.some((h) => h.toAuto === "OFFEN" && h.changedById === null)).toBe(true);
  });

  it("stoppt die Automatik, sobald ein manueller Status gesetzt wurde", async () => {
    const { nrw } = await createRegions();
    const { application } = await createCandidateWithApplication({
      bundesland: "NRW",
      regionId: nrw.id,
      createdAt: new Date(Date.now() - 100 * 3600 * 1000),
    });
    const bearbeiter = await createUser({ name: "Jana Test" });
    const user = asCurrentUser(bearbeiter, INNENDIENST_PERMS);

    await changeStatus(user, application.id, "INTERESSENTENGESPRAECH_VEREINBART", "Termin Montag");
    const result = await runStatusAutomation();
    expect(result.moved).toBe(0);

    const app = await db.application.findUniqueOrThrow({ where: { id: application.id } });
    expect(app.manualStatus).toBe("INTERESSENTENGESPRAECH_VEREINBART");
    expect(app.autoStatus).toBe("NEU"); // Automatik greift nicht mehr
  });

  it("ist idempotent (zweiter Lauf ändert nichts)", async () => {
    const { nrw } = await createRegions();
    await createCandidateWithApplication({
      bundesland: "NRW",
      regionId: nrw.id,
      createdAt: new Date(Date.now() - 80 * 3600 * 1000),
    });
    await runStatusAutomation();
    const second = await runStatusAutomation();
    expect(second.moved).toBe(0);
  });
});
