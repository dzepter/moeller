import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { runRetention, retentionPreview } from "@/server/retention";
import { runJobPublishing } from "@/server/jobs-scheduler";
import { createRegions, createCandidateWithApplication } from "../factory";

describe("Retention (§31)", () => {
  it("anonymisiert Absagen nach Ablauf der Frist, jüngere bleiben unberührt", async () => {
    const { nrw } = await createRegions();
    const old = await createCandidateWithApplication({
      bundesland: "NRW",
      regionId: nrw.id,
      manualStatus: "ABSAGE",
      createdAt: new Date(Date.now() - 200 * 86_400_000), // Default-Frist: 180 Tage
    });
    const fresh = await createCandidateWithApplication({
      bundesland: "NRW",
      regionId: nrw.id,
      manualStatus: "ABSAGE",
    });

    const preview = await retentionPreview();
    expect(preview.rejected).toBe(1);

    const result = await runRetention();
    expect(result.applications).toBe(1);

    const oldCandidate = await db.candidate.findUniqueOrThrow({ where: { id: old.candidate.id } });
    expect(oldCandidate.anonymizedAt).not.toBeNull();
    expect(oldCandidate.lastName).toBe("entfernt");
    expect(oldCandidate.email).toContain("anonymisiert-");

    const freshCandidate = await db.candidate.findUniqueOrThrow({ where: { id: fresh.candidate.id } });
    expect(freshCandidate.anonymizedAt).toBeNull();
    expect(freshCandidate.lastName).not.toBe("entfernt");

    // Löschvorgang protokolliert – ohne Inhalte
    const auditRows = await db.auditLog.findMany({ where: { action: "retention.executed" } });
    expect(auditRows).toHaveLength(1);
    expect(JSON.stringify(auditRows[0]?.meta)).not.toContain(old.candidate.lastName);
  });

  it("Kandidat bleibt erhalten, solange eine nicht-anonymisierte Bewerbung existiert", async () => {
    const { nrw } = await createRegions();
    const { candidate } = await createCandidateWithApplication({
      bundesland: "NRW",
      regionId: nrw.id,
      manualStatus: "ABSAGE",
      createdAt: new Date(Date.now() - 200 * 86_400_000),
    });
    // Zweite, aktive Bewerbung derselben Person
    await db.application.create({
      data: {
        candidateId: candidate.id,
        type: "INITIATIV",
        bundesland: "NRW",
        city: "Teststadt",
        driversLicense: true,
        previousActivity: "aktiv",
        availableFrom: "sofort",
        responsibleRegionId: nrw.id,
        consentVersion: "test",
      },
    });
    await runRetention();
    const after = await db.candidate.findUniqueOrThrow({ where: { id: candidate.id } });
    expect(after.anonymizedAt).toBeNull(); // Person nicht anonymisiert
    const apps = await db.application.findMany({ where: { candidateId: candidate.id } });
    expect(apps.filter((a) => a.anonymizedAt !== null)).toHaveLength(1); // nur die Absage
  });
});

describe("Job-Veröffentlichung & Ablauf (§14/§27)", () => {
  function jobData(slug: string) {
    return {
      slug,
      title: "Testjob",
      bundesland: "NRW" as const,
      city: "Köln",
      einsatzbereich: "LEH" as const,
      employmentType: "VOLLZEIT" as const,
      intro: "Testbeschreibung für die Veröffentlichung",
      description: {},
      tasks: ["t"],
      requirements: ["r"],
      benefits: ["b"],
    };
  }

  it("Terminveröffentlichung: Entwurf geht zum Zeitpunkt live", async () => {
    await db.job.create({
      data: { ...jobData("geplant"), status: "ENTWURF", publishAt: new Date(Date.now() - 60_000) },
    });
    await db.job.create({
      data: { ...jobData("spaeter"), status: "ENTWURF", publishAt: new Date(Date.now() + 3600_000) },
    });
    const result = await runJobPublishing();
    expect(result.published).toBe(1);
    const live = await db.job.findUniqueOrThrow({ where: { slug: "geplant" } });
    expect(live.status).toBe("VEROEFFENTLICHT");
    expect(live.publishedAt).not.toBeNull();
    const later = await db.job.findUniqueOrThrow({ where: { slug: "spaeter" } });
    expect(later.status).toBe("ENTWURF");
  });

  it("automatischer Ablauf: nur bei autoDeactivate", async () => {
    await db.job.create({
      data: { ...jobData("ablauf"), status: "VEROEFFENTLICHT", publishedAt: new Date(), expiresAt: new Date(Date.now() - 60_000), autoDeactivate: true },
    });
    await db.job.create({
      data: { ...jobData("manuell"), status: "VEROEFFENTLICHT", publishedAt: new Date(), expiresAt: new Date(Date.now() - 60_000), autoDeactivate: false },
    });
    const result = await runJobPublishing();
    expect(result.expired).toBe(1);
    expect((await db.job.findUniqueOrThrow({ where: { slug: "ablauf" } })).status).toBe("ARCHIVIERT");
    expect((await db.job.findUniqueOrThrow({ where: { slug: "manuell" } })).status).toBe("VEROEFFENTLICHT");
  });
});
