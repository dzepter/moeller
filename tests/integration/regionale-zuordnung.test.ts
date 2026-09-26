import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { submitApplication } from "@/server/applications";
import { createRegions } from "../factory";
import type { ApplicationInput } from "@/lib/validation";

function input(overrides: Partial<ApplicationInput>): ApplicationInput {
  return {
    firstName: "Anna",
    lastName: "Muster",
    city: "Mainz",
    bundesland: "RHEINLAND_PFALZ",
    driversLicense: "ja",
    previousActivity: "Einzelhandel",
    availableFrom: "sofort",
    phone: "0170 1111111",
    email: "anna.muster@test.local",
    consent: "on",
    ...overrides,
  } as ApplicationInput;
}

describe("Automatische regionale Zuordnung (§16)", () => {
  it("Rheinland-Pfalz → Team Hessen, Bundesland bleibt RLP", async () => {
    const { hessen } = await createRegions();
    const { application, candidate } = await submitApplication(input({}));

    expect(application.responsibleRegionId).toBe(hessen.id);
    expect(application.bundesland).toBe("RHEINLAND_PFALZ"); // eigenes Bundesland bleibt erhalten
    expect(candidate.bundesland).toBe("RHEINLAND_PFALZ");

    // Zuordnung protokolliert
    const log = await db.candidateAssignment.findMany({ where: { applicationId: application.id } });
    expect(log).toHaveLength(1);
    expect(log[0]?.regionId).toBe(hessen.id);
  });

  it("NRW → Team NRW, Bayern → Team Bayern, Hessen → Team Hessen", async () => {
    const { nrw, hessen, bayern } = await createRegions();
    const a = await submitApplication(input({ bundesland: "NRW", email: "a@test.local", phone: "0170 2222222" }));
    const b = await submitApplication(input({ bundesland: "BAYERN", email: "b@test.local", phone: "0170 3333333" }));
    const c = await submitApplication(input({ bundesland: "HESSEN", email: "c@test.local", phone: "0170 4444444" }));
    expect(a.application.responsibleRegionId).toBe(nrw.id);
    expect(b.application.responsibleRegionId).toBe(bayern.id);
    expect(c.application.responsibleRegionId).toBe(hessen.id);
  });

  it("dokumentiert Consent und versendet interne + Bestätigungs-Mail (datensparsam)", async () => {
    await createRegions();
    const { application, candidate } = await submitApplication(input({}));
    const consents = await db.consentRecord.findMany({ where: { candidateId: candidate.id } });
    expect(consents).toHaveLength(1);
    expect(consents[0]?.kind).toBe("BEWERBUNG");

    const mails = await db.emailLog.findMany({ orderBy: { createdAt: "asc" } });
    expect(mails.length).toBeGreaterThanOrEqual(2);
    const intern = mails.find((m) => m.template === "bewerbung-intern");
    expect(intern).toBeDefined();
    // Datensparsamkeit: interne Mail enthält keine Telefonnummer/E-Mail des Bewerbers
    expect(intern?.bodyText).not.toContain(candidate.phone);
    expect(intern?.bodyText).not.toContain(candidate.email);
    expect(intern?.bodyText).toContain(application.id); // geschützter Link
  });
});
