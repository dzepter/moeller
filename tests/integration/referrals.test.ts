import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { createReferralLink, completeReferralSelf, createDirectReferral } from "@/server/referrals";
import { convertReferral, changeReferralStatus, referralDuplicates } from "@/server/referrals-admin";
import { createRegions, createUser, asCurrentUser, createCandidateWithApplication, INNENDIENST_PERMS, TEAMLEITER_PERMS } from "../factory";
import { ForbiddenError } from "@/lib/rbac";

describe("Mitarbeiterempfehlungen (§23)", () => {
  it("Variante A: Link erzeugen → Selbsteintrag → Status KONTAKT_AUSSTEHEND", async () => {
    await createRegions();
    const referral = await createReferralLink({
      referrerFirstName: "Peter",
      referrerLastName: "Promotor",
      referrerContact: "peter@test.local",
    });
    expect(referral.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(referral.status).toBe("EMPFEHLUNG_NEU");

    const completed = await completeReferralSelf({
      code: referral.code as string,
      firstName: "Nina",
      lastName: "Neu",
      phone: "0170 5555555",
      email: "nina@test.local",
      city: "Köln",
      bundesland: "NRW",
    });
    expect(completed.status).toBe("KONTAKT_AUSSTEHEND");

    // Link ist danach verbraucht
    await expect(
      completeReferralSelf({
        code: referral.code as string,
        firstName: "X",
        lastName: "Y",
        phone: "0170 6666666",
        email: "x@test.local",
        city: "Bonn",
        bundesland: "NRW",
      }),
    ).rejects.toThrow(/bereits/);
  });

  it("Konversion erzeugt Candidate+Application, erhält Historie & Quelle & referralId", async () => {
    const { hessen } = await createRegions();
    const referral = await createDirectReferral({
      referrerFirstName: "Petra",
      referrerLastName: "Promotorin",
      referrerContact: "0170 7777777",
      referredFirstName: "Rita",
      referredLastName: "Empfohlen",
      referredPhone: "0170 8888888",
      referredEmail: "rita@test.local",
      referredCity: "Mainz",
      referredBundesland: "RHEINLAND_PFALZ",
    });
    // Consent dokumentiert (Variante B)
    const consents = await db.consentRecord.findMany({ where: { referralId: referral.id } });
    expect(consents).toHaveLength(1);

    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const { application, candidate } = await convertReferral(jana, referral.id);

    expect(application.source).toBe("MITARBEITEREMPFEHLUNG");
    expect(application.referralId).toBe(referral.id);
    expect(application.responsibleRegionId).toBe(hessen.id); // RLP → Hessen
    expect(candidate.source).toBe("MITARBEITEREMPFEHLUNG");

    const after = await db.referral.findUniqueOrThrow({ where: { id: referral.id }, include: { statusHistory: true } });
    expect(after.status).toBe("IN_BEWERBUNG_UEBERNOMMEN");
    expect(after.convertedCandidateId).toBe(candidate.id);
    expect(after.statusHistory.length).toBeGreaterThanOrEqual(2); // Historie bleibt erhalten

    // Doppelte Konversion verhindert
    await expect(convertReferral(jana, referral.id)).rejects.toThrow(/bereits übernommen/);
  });

  it("Duplikat-Warnung bei E-Mail-/Telefon-Treffer (kein Auto-Merge)", async () => {
    const { nrw } = await createRegions();
    const existing = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id, email: "doppelt@test.local" });
    const hints = await referralDuplicates({ referredEmail: "Doppelt@Test.local", referredPhone: null });
    expect(hints.map((h) => h.id)).toContain(existing.candidate.id);
  });

  it("Konversion kann kontrolliert mit bestehendem Kandidaten verknüpfen", async () => {
    const { nrw } = await createRegions();
    const existing = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id });
    const referral = await createDirectReferral({
      referrerFirstName: "P",
      referrerLastName: "P",
      referrerContact: "p@test.local",
      referredFirstName: existing.candidate.firstName,
      referredLastName: existing.candidate.lastName,
      referredPhone: existing.candidate.phone,
      referredEmail: existing.candidate.email,
      referredCity: existing.candidate.city,
      referredBundesland: "NRW",
    });
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const { candidate } = await convertReferral(jana, referral.id, { linkCandidateId: existing.candidate.id });
    expect(candidate.id).toBe(existing.candidate.id);
    const count = await db.candidate.count();
    expect(count).toBe(1); // kein Duplikat angelegt
  });

  it("Referral-Statuswechsel nur mit Berechtigung", async () => {
    await createRegions();
    const referral = await createReferralLink({ referrerFirstName: "A", referrerLastName: "B", referrerContact: "a@test.local" });
    const tl = asCurrentUser(await createUser({ name: "TL" }), TEAMLEITER_PERMS, "NRW");
    await expect(changeReferralStatus(tl, referral.id, "KONTAKTIERT")).rejects.toThrow(ForbiddenError);
  });
});
