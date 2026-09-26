import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { canDeliverMediaAsset } from "@/server/media-access";
import { createUser, asCurrentUser, INNENDIENST_PERMS, TEAMLEITER_PERMS } from "../factory";
import type { MediaApproval, MediaVisibility } from "@prisma/client";

/**
 * F/G: Medienauslieferung – Freigabestatus technisch durchgesetzt,
 * Academy-Teilnehmer nur mit Assets der EIGENEN Kursversion.
 */

async function makeAsset(visibility: MediaVisibility, approval: MediaApproval) {
  return db.mediaAsset.create({
    data: {
      fileName: `t/${Math.random().toString(36).slice(2)}.png`,
      originalName: "test.png",
      mime: "image/png",
      size: 10,
      alt: "Test",
      visibility,
      approval,
    },
  });
}

async function makeCourseVersions() {
  const course = await db.trainingCourse.create({ data: { slug: "kurs", title: "Kurs" } });
  const vA = await db.trainingCourseVersion.create({ data: { courseId: course.id, version: 1, passScore: 80, publishedAt: new Date() } });
  const vB = await db.trainingCourseVersion.create({ data: { courseId: course.id, version: 2, passScore: 80, publishedAt: new Date() } });
  return { vA, vB };
}

describe("G: Approval-Status wird bei PUBLIC-Assets technisch durchgesetzt", () => {
  it("nur FREIGEGEBEN wird öffentlich ausgeliefert; GESPERRT/FREIGABE_ERFORDERLICH niemals", async () => {
    const freigegeben = await makeAsset("PUBLIC", "FREIGEGEBEN");
    const pending = await makeAsset("PUBLIC", "FREIGABE_ERFORDERLICH");
    const gesperrt = await makeAsset("PUBLIC", "GESPERRT");
    const anon = { user: null, academyCourseVersionId: null };

    expect((await canDeliverMediaAsset(freigegeben, anon)).allow).toBe(true);
    expect((await canDeliverMediaAsset(freigegeben, anon)).publicCache).toBe(true);
    expect((await canDeliverMediaAsset(pending, anon)).allow).toBe(false);
    expect((await canDeliverMediaAsset(gesperrt, anon)).allow).toBe(false);
  });

  it("Redaktion (media.manage/cms.editContent) darf nicht-freigegebene Assets als Vorschau sehen – ohne Public-Caching", async () => {
    const pending = await makeAsset("PUBLIC", "FREIGABE_ERFORDERLICH");
    const editor = asCurrentUser(await createUser({ name: "Redaktion" }), ["media.manage"]);
    const decision = await canDeliverMediaAsset(pending, { user: editor, academyCourseVersionId: null });
    expect(decision.allow).toBe(true);
    expect(decision.publicCache).toBe(false);
  });
});

describe("F: Academy-Teilnehmer sehen nur INTERNAL-Assets der eigenen Kursversion", () => {
  it("Asset der fremden CourseVersion → kein Zugriff, eigene → Zugriff", async () => {
    const { vA, vB } = await makeCourseVersions();
    const asset = await makeAsset("INTERNAL", "FREIGABE_ERFORDERLICH");
    await db.trainingAsset.create({ data: { courseVersionId: vB.id, mediaAssetId: asset.id } });

    // Teilnehmer A (Version A) kennt die Asset-ID aus Version B
    const denied = await canDeliverMediaAsset(asset, { user: null, academyCourseVersionId: vA.id });
    expect(denied.allow).toBe(false);

    // Teilnehmer B (Version B) darf
    const allowed = await canDeliverMediaAsset(asset, { user: null, academyCourseVersionId: vB.id });
    expect(allowed.allow).toBe(true);
    expect(allowed.publicCache).toBe(false);
  });

  it("ohne Academy-Session gibt es keinen anonymen INTERNAL-Zugriff", async () => {
    const asset = await makeAsset("INTERNAL", "FREIGABE_ERFORDERLICH");
    expect((await canDeliverMediaAsset(asset, { user: null, academyCourseVersionId: null })).allow).toBe(false);
  });

  it("GESPERRTE INTERNAL-Assets bleiben auch für berechtigte Teilnehmer gesperrt", async () => {
    const { vA } = await makeCourseVersions();
    const asset = await makeAsset("INTERNAL", "GESPERRT");
    await db.trainingAsset.create({ data: { courseVersionId: vA.id, mediaAssetId: asset.id } });
    expect((await canDeliverMediaAsset(asset, { user: null, academyCourseVersionId: vA.id })).allow).toBe(false);
  });

  it("intern reicht »eingeloggt« nicht: es braucht eine passende Berechtigung", async () => {
    const asset = await makeAsset("INTERNAL", "FREIGABE_ERFORDERLICH");
    // Benutzer ganz ohne relevante Rechte
    const nobody = asCurrentUser(await createUser({ name: "Niemand" }), ["candidates.write"]);
    expect((await canDeliverMediaAsset(asset, { user: nobody, academyCourseVersionId: null })).allow).toBe(false);

    // Teamleiter mit academy.viewRegional darf (betreut Teilnehmer)
    const tl = asCurrentUser(await createUser({ name: "TL" }), TEAMLEITER_PERMS);
    expect((await canDeliverMediaAsset(asset, { user: tl, academyCourseVersionId: null })).allow).toBe(true);

    // Innendienst (academy.manageParticipants) darf
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    expect((await canDeliverMediaAsset(asset, { user: jana, academyCourseVersionId: null })).allow).toBe(true);
  });
});
