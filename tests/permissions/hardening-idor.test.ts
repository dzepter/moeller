import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/rbac";
import { submitApplication, findDuplicateHints } from "@/server/applications";
import { addNote, createReminder, completeReminder, reassignApplication } from "@/server/candidates";
import { convertReferral } from "@/server/referrals-admin";
import type { ApplicationInput } from "@/lib/validation";
import {
  createRegions,
  createUser,
  asCurrentUser,
  createCandidateWithApplication,
  INNENDIENST_PERMS,
  TEAMLEITER_PERMS,
} from "../factory";

/**
 * Negative Regressionstests des Hardening-Pakets: jede Service-Grenze wird
 * gezielt mit fremden bzw. manipulierten IDs aufgerufen – nicht nur Happy Path.
 */

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

describe("J: Öffentliche Bewerbung überschreibt keine Candidate-Stammdaten", () => {
  it("bekannte E-Mail + manipulierte Stammdaten → Bestand bleibt unverändert, neue Bewerbung wird trotzdem angenommen", async () => {
    const { nrw } = await createRegions();
    // Bestehender, intern gepflegter Kandidat
    const bestand = await db.candidate.create({
      data: {
        firstName: "Max",
        lastName: "Mustermann",
        email: "max@test.local",
        emailNormalized: "max@test.local",
        phone: "+491700000001",
        phoneNormalized: "+491700000001",
        city: "Köln",
        bundesland: "NRW",
      },
    });

    // Öffentliche Bewerbung mit derselben E-Mail, aber komplett anderen Angaben
    const { candidate: neu, application } = await submitApplication(
      input({
        email: "max@test.local",
        firstName: "Angreifer",
        lastName: "Anders",
        phone: "0170 9999999",
        city: "Berlin",
        bundesland: "NRW",
      }),
    );

    // Neue Bewerbung existiert – aber an einem NEUEN Kandidaten (kein Auto-Merge per E-Mail)
    expect(application.id).toBeTruthy();
    expect(neu.id).not.toBe(bestand.id);

    // Bestehende Stammdaten sind unangetastet
    const after = await db.candidate.findUniqueOrThrow({ where: { id: bestand.id } });
    expect(after.firstName).toBe("Max");
    expect(after.lastName).toBe("Mustermann");
    expect(after.phone).toBe("+491700000001");
    expect(after.city).toBe("Köln");
    expect(after.bundesland).toBe("NRW");

    // Duplikat wird für den Innendienst erkannt (manuelles Zusammenführen möglich)
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const hints = await findDuplicateHints(jana, neu.id);
    expect(hints.map((h) => h.id)).toContain(bestand.id);
    void nrw;
  });
});

describe("A: Duplikat-Hinweise sind gegen IDOR und Cross-Region-Leaks geschützt", () => {
  it("Teamleiter Region A erhält für fremde Candidate-IDs keinen Zugriff und keine PII", async () => {
    const regions = await createRegions();
    // Kandidat ausschließlich in Region Bayern
    const fremd = await createCandidateWithApplication({ bundesland: "BAYERN", regionId: regions.bayern.id });

    const tlNrw = asCurrentUser(
      await createUser({ name: "TL NRW", regionId: regions.nrw.id }),
      TEAMLEITER_PERMS,
      "NRW",
    );

    // Manipulierte/erratene Candidate-ID → ForbiddenError, keine Daten
    await expect(findDuplicateHints(tlNrw, fremd.candidate.id)).rejects.toThrow(ForbiddenError);
  });

  it("Treffer aus fremden Regionen tauchen in der Hinweisliste nicht auf", async () => {
    const regions = await createRegions();
    // Zwilling mit gleicher E-Mail: einer in NRW (sichtbar), einer in Bayern (fremd)
    const eigen = await createCandidateWithApplication({
      bundesland: "NRW",
      regionId: regions.nrw.id,
      email: "zwilling@test.local",
    });
    const fremd = await db.candidate.create({
      data: {
        firstName: "Fremd",
        lastName: "Zwilling",
        email: "zwilling@test.local",
        emailNormalized: "zwilling@test.local",
        phone: "+491700000002",
        phoneNormalized: "+491700000002",
        city: "München",
        bundesland: "BAYERN",
      },
    });
    await db.application.create({
      data: {
        candidateId: fremd.id,
        type: "INITIATIV",
        bundesland: "BAYERN",
        city: "München",
        driversLicense: false,
        previousActivity: "x",
        availableFrom: "sofort",
        responsibleRegionId: regions.bayern.id,
        consentVersion: "test",
      },
    });

    const tlNrw = asCurrentUser(
      await createUser({ name: "TL NRW", regionId: regions.nrw.id }),
      TEAMLEITER_PERMS,
      "NRW",
    );
    const hints = await findDuplicateHints(tlNrw, eigen.candidate.id);
    expect(hints.map((h) => h.id)).not.toContain(fremd.id);

    // Innendienst (read.all) sieht den Zwilling dagegen sehr wohl
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const all = await findDuplicateHints(jana, eigen.candidate.id);
    expect(all.map((h) => h.id)).toContain(fremd.id);
  });
});

describe("B/C: Relationale IDs bei Notizen und Wiedervorlagen", () => {
  it("B: addNote mit candidateId A + applicationId von Kandidat B wird abgelehnt", async () => {
    const regions = await createRegions();
    const a = await createCandidateWithApplication({ bundesland: "NRW", regionId: regions.nrw.id });
    const b = await createCandidateWithApplication({ bundesland: "NRW", regionId: regions.nrw.id });
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);

    await expect(
      addNote(jana, { candidateId: a.candidate.id, applicationId: b.application.id, body: "quer verlinkt" }),
    ).rejects.toThrow(ForbiddenError);

    // Kontrolle: korrekt verknüpft funktioniert
    const note = await addNote(jana, { candidateId: a.candidate.id, applicationId: a.application.id, body: "ok" });
    expect(note.applicationId).toBe(a.application.id);
  });

  it("B: addNote über fremde Application-ID scheitert auch für Teamleiter mit Schreibrecht", async () => {
    const regions = await createRegions();
    const fremd = await createCandidateWithApplication({ bundesland: "BAYERN", regionId: regions.bayern.id });
    const tlNrw = asCurrentUser(
      await createUser({ name: "TL NRW", regionId: regions.nrw.id }),
      TEAMLEITER_PERMS,
      "NRW",
    );
    await expect(
      addNote(tlNrw, { candidateId: fremd.candidate.id, applicationId: fremd.application.id, body: "fremd" }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("C: createReminder validiert applicationId-, referralId- und assigneeId-Bezüge", async () => {
    const regions = await createRegions();
    const eigen = await createCandidateWithApplication({ bundesland: "NRW", regionId: regions.nrw.id });
    const fremd = await createCandidateWithApplication({ bundesland: "BAYERN", regionId: regions.bayern.id });
    const tlNrw = asCurrentUser(
      await createUser({ name: "TL NRW", regionId: regions.nrw.id }),
      TEAMLEITER_PERMS,
      "NRW",
    );
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const morgen = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    // Manipulierte fremde applicationId (ohne candidateId → früher ungeprüft)
    await expect(
      createReminder(tlNrw, { applicationId: fremd.application.id, dueDate: morgen, subject: "x", assigneeId: tlNrw.id }),
    ).rejects.toThrow(ForbiddenError);

    // candidateId A + applicationId B (Quer-Verknüpfung)
    await expect(
      createReminder(jana, {
        candidateId: eigen.candidate.id,
        applicationId: fremd.application.id,
        dueDate: morgen,
        subject: "x",
        assigneeId: jana.id,
      }),
    ).rejects.toThrow(ForbiddenError);

    // referralId ohne referrals.manage (Teamleiter)
    const referral = await db.referral.create({
      data: { type: "LINK", referrerFirstName: "P", referrerLastName: "P", referrerEmail: "p@test.local", code: "TESTCODE1" },
    });
    await expect(
      createReminder(tlNrw, {
        candidateId: eigen.candidate.id,
        referralId: referral.id,
        dueDate: morgen,
        subject: "x",
        assigneeId: tlNrw.id,
      }),
    ).rejects.toThrow(ForbiddenError);

    // Inaktiver Zuständiger
    const inaktiv = await createUser({ name: "Inaktiv" });
    await db.user.update({ where: { id: inaktiv.id }, data: { active: false } });
    await expect(
      createReminder(jana, { candidateId: eigen.candidate.id, dueDate: morgen, subject: "x", assigneeId: inaktiv.id }),
    ).rejects.toThrow(/aktiv/);

    // Kandidat wird bei applicationId immer aus der Bewerbung abgeleitet
    const ok = await createReminder(jana, {
      applicationId: eigen.application.id,
      dueDate: morgen,
      subject: "Rückruf",
      assigneeId: jana.id,
    });
    expect(ok.candidateId).toBe(eigen.candidate.id);
  });

  it("C: completeReminder prüft den Objektbezug auch ohne candidateId", async () => {
    const regions = await createRegions();
    const fremd = await createCandidateWithApplication({ bundesland: "BAYERN", regionId: regions.bayern.id });
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const tlNrw = asCurrentUser(
      await createUser({ name: "TL NRW", regionId: regions.nrw.id }),
      TEAMLEITER_PERMS,
      "NRW",
    );

    // Reminder, der NUR über applicationId hängt (candidateId absichtlich leer)
    const reminder = await db.reminder.create({
      data: {
        applicationId: fremd.application.id,
        dueDate: new Date(),
        subject: "fremd",
        assigneeId: jana.id,
        createdById: jana.id,
      },
    });
    await expect(completeReminder(tlNrw, reminder.id)).rejects.toThrow(ForbiddenError);

    // Innendienst darf
    await completeReminder(jana, reminder.id);
    const done = await db.reminder.findUniqueOrThrow({ where: { id: reminder.id } });
    expect(done.done).toBe(true);
  });

  it("C: reassignApplication verlangt existierende Region und aktive Person", async () => {
    const regions = await createRegions();
    const eigen = await createCandidateWithApplication({ bundesland: "NRW", regionId: regions.nrw.id });
    const jana = asCurrentUser(await createUser({ name: "Jana" }), [...INNENDIENST_PERMS, "candidates.assign"]);

    await expect(
      reassignApplication(jana, eigen.application.id, { regionId: "gibt-es-nicht" }),
    ).rejects.toThrow(/Region/);

    const inaktiv = await createUser({ name: "Weg" });
    await db.user.update({ where: { id: inaktiv.id }, data: { active: false } });
    await expect(
      reassignApplication(jana, eigen.application.id, { regionId: regions.nrw.id, assignedUserId: inaktiv.id }),
    ).rejects.toThrow(/aktiv/);
  });
});

describe("D: Referral-Konvertierung akzeptiert nur echte Duplikat-Matches", () => {
  it("beliebige linkCandidateId wird abgelehnt; passende E-Mail wird akzeptiert", async () => {
    const regions = await createRegions();
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);

    const referral = await db.referral.create({
      data: {
        type: "DIREKT",
        referrerFirstName: "Paula",
        referrerLastName: "P",
        referrerEmail: "paula@test.local",
        consentConfirmed: true,
        referredFirstName: "Emre",
        referredLastName: "Empfohlen",
        referredEmail: "emre@test.local",
        referredPhone: "0171 5556677",
        referredCity: "Bonn",
        referredBundesland: "NRW",
        consentAt: new Date(),
      },
    });

    // Ein völlig fremder Kandidat (andere Person)
    const fremd = await createCandidateWithApplication({ bundesland: "NRW", regionId: regions.nrw.id });
    await expect(
      convertReferral(jana, referral.id, { linkCandidateId: fremd.candidate.id }),
    ).rejects.toThrow(/passt nicht/);

    // Ein echter Match (gleiche E-Mail) wird verknüpft, Historie/Quelle bleiben
    const match = await db.candidate.create({
      data: {
        firstName: "Emre",
        lastName: "Alt",
        email: "emre@test.local",
        emailNormalized: "emre@test.local",
        phone: "+491710000009",
        phoneNormalized: "+491710000009",
        city: "Bonn",
        bundesland: "NRW",
      },
    });
    const result = await convertReferral(jana, referral.id, { linkCandidateId: match.id });
    expect(result.candidate.id).toBe(match.id);
    expect(result.application.referralId).toBe(referral.id);
    expect(result.application.source).toBe("MITARBEITEREMPFEHLUNG");
  });

  it("Nachname allein ist NIEMALS ein Match (Referral ohne Stadt)", async () => {
    const regions = await createRegions();
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);

    // Empfehlung OHNE Stadt und ohne E-Mail (nur Telefon der echten Person)
    const referral = await db.referral.create({
      data: {
        type: "DIREKT",
        referrerFirstName: "Paula",
        referrerLastName: "P",
        referrerEmail: "paula2@test.local",
        consentConfirmed: true,
        referredFirstName: "Kerim",
        referredLastName: "Schmidt",
        referredPhone: "0171 8887766",
        referredBundesland: "NRW",
        consentAt: new Date(),
      },
    });

    // Anderer Mensch, zufällig gleicher (häufiger) Nachname → MUSS abgelehnt werden
    const namensvetter = await createCandidateWithApplication({
      bundesland: "NRW",
      regionId: regions.nrw.id,
      lastName: "Schmidt",
    });
    await expect(
      convertReferral(jana, referral.id, { linkCandidateId: namensvetter.candidate.id }),
    ).rejects.toThrow(/passt nicht/);

    // Identische Telefonnummer bleibt ein gültiger Match
    const echterMatch = await db.candidate.create({
      data: {
        firstName: "Kerim",
        lastName: "Schmidt",
        email: "kerim@test.local",
        emailNormalized: "kerim@test.local",
        phone: "0171 8887766",
        phoneNormalized: "+491718887766",
        city: "Essen",
        bundesland: "NRW",
      },
    });
    const ok = await convertReferral(jana, referral.id, { linkCandidateId: echterMatch.id });
    expect(ok.candidate.id).toBe(echterMatch.id);
  });

  it("Name + Wohnort matcht nur, wenn beide Werte vorhanden sind (inkl. Vorname, falls bekannt)", async () => {
    const regions = await createRegions();
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const referral = await db.referral.create({
      data: {
        type: "DIREKT",
        referrerFirstName: "Paula",
        referrerLastName: "P",
        referrerEmail: "paula3@test.local",
        consentConfirmed: true,
        referredFirstName: "Lena",
        referredLastName: "Krause",
        referredPhone: "0171 1231212",
        referredCity: "Bonn",
        referredBundesland: "NRW",
        consentAt: new Date(),
      },
    });

    // Gleicher Nachname + Stadt, aber anderer Vorname → abgelehnt (Vorname ist bekannt)
    const andereLena = await db.candidate.create({
      data: {
        firstName: "Marta",
        lastName: "Krause",
        email: "marta@test.local",
        emailNormalized: "marta@test.local",
        phone: "+491700000042",
        phoneNormalized: "+491700000042",
        city: "Bonn",
        bundesland: "NRW",
      },
    });
    await expect(
      convertReferral(jana, referral.id, { linkCandidateId: andereLena.id }),
    ).rejects.toThrow(/passt nicht/);

    // Vor- + Nachname + Stadt → akzeptiert
    const passt = await db.candidate.create({
      data: {
        firstName: "Lena",
        lastName: "Krause",
        email: "lena@test.local",
        emailNormalized: "lena@test.local",
        phone: "+491700000043",
        phoneNormalized: "+491700000043",
        city: "Bonn",
        bundesland: "NRW",
      },
    });
    const ok = await convertReferral(jana, referral.id, { linkCandidateId: passt.id });
    expect(ok.candidate.id).toBe(passt.id);
    void regions;
  });
});
