import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { deletePendingFiles } from "@/server/retention";
import { createRegions, createUser, createCandidateWithApplication } from "../factory";
import type { ApplicationInput } from "@/lib/validation";

/**
 * Punkte 2 + 6: DB und Storage bilden keine gemeinsame Transaktion – kein
 * Fehlerpfad darf dauerhaft (a) eine Storage-Datei ohne DB-Referenz oder
 * (b) eine DB-Referenz auf eine absichtlich gelöschte Datei hinterlassen.
 */

type FakeSession = Record<string, unknown> & { user: Record<string, unknown> };
const sessionState: { current: FakeSession | null } = { current: null };

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...mod, getSession: vi.fn(async () => sessionState.current) };
});

function adminSession(user: { id: string; email: string; name: string }, permissions: string[]): FakeSession {
  return {
    id: "sess-test",
    userId: user.id,
    mfaPending: false,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 3_600_000),
    user: {
      ...user,
      passwordHash: "x",
      active: true,
      regionId: null,
      region: null,
      mustChangePassword: false,
      mfaEnabledAt: new Date(),
      roles: [{ role: { key: "ADMINISTRATOR", permissions: permissions.map((key) => ({ permission: { key } })) } }],
    },
  };
}

/** Minimal gültige PNG-Datei (Signatur + IHDR 1×1) für Upload-Validierung. */
function tinyPng(): Buffer {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8); // IHDR-Länge
  b.write("IHDR", 12);
  b.writeUInt32BE(1, 16); // width
  b.writeUInt32BE(1, 20); // height
  return b;
}

beforeEach(() => {
  sessionState.current = null;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Punkt 2: Manuelle Anonymisierung nutzt Mark-then-Delete", () => {
  it("Storage-Ausfall: PII trotzdem anonymisiert, Datei markiert (nicht auslieferbar), Retry räumt auf", async () => {
    const { nrw } = await createRegions();
    const { candidate } = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id });
    const fileName = `t/${Math.random().toString(36).slice(2)}.pdf`;
    await storage.put("private", fileName, Buffer.from("%PDF-1.4 x"), "application/pdf");
    const file = await db.privateFile.create({
      data: { candidateId: candidate.id, kind: "CV", fileName, originalName: "cv.pdf", mime: "application/pdf", size: 10 },
    });

    const admin = await createUser({ name: "Datenschutz" });
    sessionState.current = adminSession(admin, ["privacy.manage"]);
    const { anonymizeCandidateAction } = await import("@/app/actions/admin-privacy");

    const spy = vi.spyOn(storage, "delete").mockRejectedValue(new Error("S3 down"));
    const fd = new FormData();
    fd.set("candidateId", candidate.id);
    await anonymizeCandidateAction(fd);

    // PII ist anonymisiert, obwohl das Storage nicht erreichbar war
    const after = await db.candidate.findUniqueOrThrow({ where: { id: candidate.id } });
    expect(after.anonymizedAt).not.toBeNull();
    expect(after.lastName).toBe("entfernt");

    // Datei-Zeile bleibt, aber als »zur Löschung markiert« → nie auslieferbar
    const marked = await db.privateFile.findUniqueOrThrow({ where: { id: file.id } });
    expect(marked.pendingDeletionAt).not.toBeNull();

    // Retry (nächster Retention-Lauf) löscht Storage + Zeile
    spy.mockRestore();
    const retry = await deletePendingFiles();
    expect(retry.deleted).toBe(1);
    expect(await db.privateFile.findUnique({ where: { id: file.id } })).toBeNull();
  });
});

describe("Punkt 6A: CV-Upload hinterlässt kein Storage-Orphan", () => {
  it("DB-Transaktion schlägt nach storage.put fehl → Datei wird kompensierend gelöscht", async () => {
    const { nrw } = await createRegions();
    void nrw;
    await db.job.create({
      data: {
        slug: "cv-job",
        title: "Mit Upload",
        bundesland: "NRW",
        city: "Köln",
        einsatzbereich: "LEH",
        employmentType: "VOLLZEIT",
        intro: "x",
        tasks: ["x"],
        requirements: ["x"],
        benefits: ["x"],
        description: {},
        status: "VEROEFFENTLICHT",
        publishedAt: new Date(),
        cvUploadEnabled: true,
        driversLicense: "VON_VORTEIL",
        contactName: "Jana",
      },
    });
    const { submitApplication } = await import("@/server/applications");

    const putSpy = vi.spyOn(storage, "put");
    const deleteSpy = vi.spyOn(storage, "delete");
    const txSpy = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error("DB weg"));

    const input = {
      firstName: "Cv",
      lastName: "Fall",
      city: "Köln",
      bundesland: "NRW",
      driversLicense: "ja",
      previousActivity: "x",
      availableFrom: "sofort",
      phone: "0170 1112223",
      email: "cv-fall@test.local",
      consent: "on",
      jobSlug: "cv-job",
    } as unknown as ApplicationInput;

    await expect(
      submitApplication(input, { cv: { name: "cv.pdf", data: Buffer.from("%PDF-1.4 test") } }),
    ).rejects.toThrow("DB weg");
    txSpy.mockRestore();

    // Datei wurde abgelegt … und kompensierend wieder entfernt
    expect(putSpy).toHaveBeenCalledTimes(1);
    const storedName = putSpy.mock.calls[0]?.[1] as string;
    expect(deleteSpy).toHaveBeenCalledWith("private", storedName);
    await expect(storage.get("private", storedName)).rejects.toThrow();
    expect(await db.privateFile.count()).toBe(0);
  });
});

describe("Punkt 6B/6C: Medienbibliothek Upload/Delete", () => {
  it("Upload: DB-Anlage schlägt fehl → kompensierendes Storage-Delete, kein Orphan", async () => {
    const admin = await createUser({ name: "Medien" });
    sessionState.current = adminSession(admin, ["media.manage"]);
    const { uploadMediaAction } = await import("@/app/actions/admin-media");

    const deleteSpy = vi.spyOn(storage, "delete");
    const createSpy = vi.spyOn(db.mediaAsset, "create").mockRejectedValueOnce(new Error("DB weg"));

    const fd = new FormData();
    fd.set("file", new File([new Uint8Array(tinyPng())], "bild.png", { type: "image/png" }));
    fd.set("alt", "Testbild");
    const result = await uploadMediaAction(null, fd);
    createSpy.mockRestore();

    expect(result?.error).toBeTruthy();
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    const [scope, name] = deleteSpy.mock.calls[0] as [string, string];
    await expect(storage.get(scope as "public" | "private", name)).rejects.toThrow();
    expect(await db.mediaAsset.count()).toBe(0);
  });

  it("Delete: DB zuerst – Storage-Fehler hinterlässt nie eine DB-Referenz auf eine fehlende Datei", async () => {
    const admin = await createUser({ name: "Medien" });
    sessionState.current = adminSession(admin, ["media.manage"]);
    const { deleteMediaAction } = await import("@/app/actions/admin-media");

    const fileName = `t/${Math.random().toString(36).slice(2)}.png`;
    await storage.put("public", fileName, tinyPng(), "image/png");
    const asset = await db.mediaAsset.create({
      data: { fileName, originalName: "b.png", mime: "image/png", size: 33, alt: "x", visibility: "PUBLIC", approval: "FREIGEGEBEN" },
    });

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const delSpy = vi.spyOn(storage, "delete").mockRejectedValueOnce(new Error("S3 down"));
    const fd = new FormData();
    fd.set("id", asset.id);
    await deleteMediaAction(fd); // darf nicht werfen

    // DB-Referenz ist weg (gefährliche Richtung ausgeschlossen), Orphan geloggt
    expect(await db.mediaAsset.findUnique({ where: { id: asset.id } })).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    delSpy.mockRestore();

    // Aufräumen der real verbliebenen Datei
    await storage.delete("public", fileName);
  });
});
