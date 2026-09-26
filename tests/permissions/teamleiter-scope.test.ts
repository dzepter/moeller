import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import {
  applicationScope,
  canAccessApplication,
  getEffectiveRegionIds,
  ForbiddenError,
} from "@/lib/rbac";
import { getApplicationDetail, listApplications, changeStatus } from "@/server/candidates";
import { createRegions, createUser, asCurrentUser, createCandidateWithApplication, TEAMLEITER_PERMS, INNENDIENST_PERMS } from "../factory";

/**
 * Pflicht-Permission-Tests (Masterprompt §21/§40):
 * Regionale Sichtbarkeit wird SERVERSEITIG durchgesetzt – auch bei direktem
 * ID-Zugriff (kein IDOR).
 */

async function setupWorld() {
  const regions = await createRegions();
  const tlNrw = await createUser({ name: "TL NRW", regionId: regions.nrw.id });
  const tlHessen = await createUser({ name: "TL Hessen", regionId: regions.hessen.id });
  const tlBayern = await createUser({ name: "TL Bayern", regionId: regions.bayern.id });

  const appNrw = await createCandidateWithApplication({ bundesland: "NRW", regionId: regions.nrw.id });
  const appHessen = await createCandidateWithApplication({ bundesland: "HESSEN", regionId: regions.hessen.id });
  const appRlp = await createCandidateWithApplication({ bundesland: "RHEINLAND_PFALZ", regionId: regions.hessen.id });
  const appBayern = await createCandidateWithApplication({ bundesland: "BAYERN", regionId: regions.bayern.id });

  return { regions, tlNrw, tlHessen, tlBayern, appNrw, appHessen, appRlp, appBayern };
}

describe("Teamleiter-Sichtbarkeit (serverseitig)", () => {
  it("NRW sieht NRW, aber weder Hessen noch RLP noch Bayern", async () => {
    const w = await setupWorld();
    const user = asCurrentUser(w.tlNrw, TEAMLEITER_PERMS, "NRW");

    const { items } = await listApplications(user, {});
    const ids = items.map((a) => a.id);
    expect(ids).toContain(w.appNrw.application.id);
    expect(ids).not.toContain(w.appHessen.application.id);
    expect(ids).not.toContain(w.appRlp.application.id);
    expect(ids).not.toContain(w.appBayern.application.id);
  });

  it("Hessen sieht Hessen UND Rheinland-Pfalz, aber nicht NRW/Bayern", async () => {
    const w = await setupWorld();
    const user = asCurrentUser(w.tlHessen, TEAMLEITER_PERMS, "HESSEN");
    const { items } = await listApplications(user, {});
    const ids = items.map((a) => a.id);
    expect(ids).toContain(w.appHessen.application.id);
    expect(ids).toContain(w.appRlp.application.id);
    expect(ids).not.toContain(w.appNrw.application.id);
    expect(ids).not.toContain(w.appBayern.application.id);
  });

  it("Bayern sieht Hessen/RLP nicht", async () => {
    const w = await setupWorld();
    const user = asCurrentUser(w.tlBayern, TEAMLEITER_PERMS, "BAYERN");
    const { items } = await listApplications(user, {});
    const ids = items.map((a) => a.id);
    expect(ids).toEqual([w.appBayern.application.id]);
  });

  it("kein IDOR: direkter Zugriff auf fremde Bewerbung wirft ForbiddenError", async () => {
    const w = await setupWorld();
    const nrwUser = asCurrentUser(w.tlNrw, TEAMLEITER_PERMS, "NRW");
    await expect(getApplicationDetail(nrwUser, w.appBayern.application.id)).rejects.toThrow(ForbiddenError);
    // Schreiben ebenso verboten
    await expect(changeStatus(nrwUser, w.appBayern.application.id, "ZUSAGE")).rejects.toThrow(ForbiddenError);
  });

  it("explizit zugewiesene Datensätze sind auch außerhalb der Region sichtbar", async () => {
    const w = await setupWorld();
    const assigned = await createCandidateWithApplication({
      bundesland: "BAYERN",
      regionId: w.regions.bayern.id,
      assignedUserId: w.tlNrw.id,
    });
    const nrwUser = asCurrentUser(w.tlNrw, TEAMLEITER_PERMS, "NRW");
    const detail = await getApplicationDetail(nrwUser, assigned.application.id);
    expect(detail?.id).toBe(assigned.application.id);
  });

  it("Innendienst sieht alles operativ", async () => {
    await setupWorld();
    const jana = await createUser({ name: "Jana" });
    const user = asCurrentUser(jana, INNENDIENST_PERMS);
    const { items } = await listApplications(user, {});
    expect(items).toHaveLength(4);
  });

  it("Innendienst hat keine Website-/Benutzer-Rechte (Permission-Set)", () => {
    expect(INNENDIENST_PERMS).not.toContain("cms.editContent");
    expect(INNENDIENST_PERMS).not.toContain("cms.publish");
    expect(INNENDIENST_PERMS).not.toContain("users.manage");
    expect(INNENDIENST_PERMS).not.toContain("settings.manage");
  });
});

describe("Vertretung (Delegation) & Scope", () => {
  it("Vertreter sieht Zusatzgebiet nur im Zeitfenster; danach automatisch entzogen", async () => {
    const w = await setupWorld();
    const nrwUser = asCurrentUser(w.tlNrw, TEAMLEITER_PERMS, "NRW");

    // Aktive Vertretung: NRW-TL vertritt Bayern-TL
    const delegation = await db.teamLeadDelegation.create({
      data: {
        fromUserId: w.tlBayern.id,
        toUserId: w.tlNrw.id,
        startsAt: new Date(Date.now() - 3600_000),
        endsAt: new Date(Date.now() + 3600_000),
      },
    });

    let regionIds = await getEffectiveRegionIds(nrwUser);
    expect(regionIds).toContain(w.regions.nrw.id);
    expect(regionIds).toContain(w.regions.bayern.id);
    expect(await canAccessApplication(nrwUser, w.appBayern.application)).toBe(true);

    // Nach Ablauf: Rechte weg (Scope wird zur Laufzeit berechnet)
    await db.teamLeadDelegation.update({
      where: { id: delegation.id },
      data: { endsAt: new Date(Date.now() - 60_000) },
    });
    regionIds = await getEffectiveRegionIds(nrwUser);
    expect(regionIds).not.toContain(w.regions.bayern.id);
    expect(await canAccessApplication(nrwUser, w.appBayern.application)).toBe(false);
  });

  it("vor Beginn der Vertretung gibt es noch keine Zusatzrechte", async () => {
    const w = await setupWorld();
    await db.teamLeadDelegation.create({
      data: {
        fromUserId: w.tlBayern.id,
        toUserId: w.tlNrw.id,
        startsAt: new Date(Date.now() + 3600_000),
        endsAt: new Date(Date.now() + 7200_000),
      },
    });
    const nrwUser = asCurrentUser(w.tlNrw, TEAMLEITER_PERMS, "NRW");
    expect(await getEffectiveRegionIds(nrwUser)).not.toContain(w.regions.bayern.id);
  });

  it("keine transitive Vererbung: A→B und B→C ergibt kein A→C", async () => {
    const w = await setupWorld();
    // Hessen vertritt NRW; Bayern vertritt Hessen → Bayern darf NICHT NRW sehen
    await db.teamLeadDelegation.create({
      data: { fromUserId: w.tlNrw.id, toUserId: w.tlHessen.id, startsAt: new Date(Date.now() - 1000), endsAt: new Date(Date.now() + 3600_000) },
    });
    await db.teamLeadDelegation.create({
      data: { fromUserId: w.tlHessen.id, toUserId: w.tlBayern.id, startsAt: new Date(Date.now() - 1000), endsAt: new Date(Date.now() + 3600_000) },
    });
    const bayernUser = asCurrentUser(w.tlBayern, TEAMLEITER_PERMS, "BAYERN");
    const regionIds = await getEffectiveRegionIds(bayernUser);
    // Bayern bekommt Hessens EIGENE Region, aber nicht die von Hessen nur vertretene NRW-Region
    expect(regionIds).toContain(w.regions.hessen.id);
    expect(regionIds).not.toContain(w.regions.nrw.id);
  });

  it("ohne jede Berechtigung ist der Scope leer", async () => {
    await setupWorld();
    const nobody = await createUser({ name: "Niemand" });
    const user = asCurrentUser(nobody, []);
    const scope = await applicationScope(user);
    const rows = await db.application.findMany({ where: scope });
    expect(rows).toHaveLength(0);
  });
});
