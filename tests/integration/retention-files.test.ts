import { describe, it, expect, vi, afterEach } from "vitest";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { runRetention, deletePendingFiles } from "@/server/retention";
import { createRegions, createCandidateWithApplication } from "../factory";

/**
 * Punkt 16: DB und Storage bilden keine gemeinsame Transaktion. Der Ablauf
 * muss deshalb Mark-then-Delete + Retry sein: Es darf NIE der Zustand
 * entstehen »Datei weg, DB verweist dauerhaft darauf«.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

async function makeDueApplicationWithCv() {
  const { nrw } = await createRegions();
  const old = new Date(Date.now() - 200 * 86_400_000); // > Default 180 Tage
  const { candidate, application } = await createCandidateWithApplication({
    bundesland: "NRW",
    regionId: nrw.id,
    manualStatus: "ABSAGE",
    createdAt: old,
  });
  const fileName = `test/${Math.random().toString(36).slice(2)}.pdf`;
  await storage.put("private", fileName, Buffer.from("%PDF-1.4 test"), "application/pdf");
  const file = await db.privateFile.create({
    data: { candidateId: candidate.id, kind: "CV", fileName, originalName: "cv.pdf", mime: "application/pdf", size: 13 },
  });
  await db.application.update({ where: { id: application.id }, data: { cvFileId: file.id } });
  return { candidate, application, file };
}

describe("Retention: Datei-Löschung ist robust und retryfähig", () => {
  it("Storage-Fehler → DB bleibt konsistent (markiert), nächster Lauf räumt auf", async () => {
    const { application, file } = await makeDueApplicationWithCv();

    // Erster Lauf: Storage-Löschung schlägt fehl
    const spy = vi.spyOn(storage, "delete").mockRejectedValue(new Error("S3 down"));
    await runRetention();

    // Bewerbung ist anonymisiert, Datei-Zeile existiert noch – aber als
    // »zur Löschung markiert«, nicht als dauerhaft toter Verweis
    const appAfter = await db.application.findUniqueOrThrow({ where: { id: application.id } });
    expect(appAfter.anonymizedAt).not.toBeNull();
    const fileAfter = await db.privateFile.findUniqueOrThrow({ where: { id: file.id } });
    expect(fileAfter.pendingDeletionAt).not.toBeNull();

    // Zweiter Lauf mit funktionierendem Storage: Zeile verschwindet,
    // cvFileId wird per SetNull automatisch geleert
    spy.mockRestore();
    const result = await deletePendingFiles();
    expect(result.deleted).toBe(1);
    expect(await db.privateFile.findUnique({ where: { id: file.id } })).toBeNull();
    const appFinal = await db.application.findUniqueOrThrow({ where: { id: application.id } });
    expect(appFinal.cvFileId).toBeNull();
  });

  it("Happy Path: Lauf ohne Störung löscht Datei-Zeile im selben Durchgang", async () => {
    const { file } = await makeDueApplicationWithCv();
    await runRetention();
    expect(await db.privateFile.findUnique({ where: { id: file.id } })).toBeNull();
  });
});
