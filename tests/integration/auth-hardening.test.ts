import { describe, it, expect, vi, afterEach } from "vitest";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { consumePasswordReset } from "@/lib/auth/password-reset";
import { generateToken, hashToken } from "@/lib/crypto";
import { createUser } from "../factory";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("H: Rate-Limit ist unter parallelen Requests atomar", () => {
  it("30 gleichzeitige Requests, Limit 10 → exakt 10 kommen durch", async () => {
    const results = await Promise.all(
      Array.from({ length: 30 }, () => rateLimit({ key: "test:parallel", limit: 10, windowSeconds: 60 })),
    );
    const allowed = results.filter((r) => r.ok).length;
    expect(allowed).toBe(10);
  });

  it("Sperrzeit greift und hält auch bei weiteren parallelen Requests", async () => {
    for (let i = 0; i < 4; i++) {
      await rateLimit({ key: "test:block", limit: 3, windowSeconds: 60, blockSeconds: 300 });
    }
    const after = await Promise.all(
      Array.from({ length: 5 }, () => rateLimit({ key: "test:block", limit: 3, windowSeconds: 60, blockSeconds: 300 })),
    );
    expect(after.every((r) => !r.ok)).toBe(true);
    const bucket = await db.rateLimitBucket.findUnique({ where: { key: "test:block" } });
    expect(bucket?.blockedUntil && bucket.blockedUntil > new Date()).toBe(true);
  });

  it("neues Zeitfenster setzt den Zähler zurück", async () => {
    await rateLimit({ key: "test:window", limit: 2, windowSeconds: 60 });
    await rateLimit({ key: "test:window", limit: 2, windowSeconds: 60 });
    expect((await rateLimit({ key: "test:window", limit: 2, windowSeconds: 60 })).ok).toBe(false);
    // Fenster künstlich altern lassen
    await db.rateLimitBucket.update({
      where: { key: "test:window" },
      data: { windowStartAt: new Date(Date.now() - 120_000) },
    });
    expect((await rateLimit({ key: "test:window", limit: 2, windowSeconds: 60 })).ok).toBe(true);
  });
});

describe("I: Passwort-Reset-Token ist nur einmal verwendbar – auch parallel", () => {
  it("zwei nahezu gleichzeitige Requests → genau einer gewinnt", async () => {
    const user = await createUser({ name: "Resetta" });
    const token = generateToken();
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3_600_000) },
    });

    const [a, b] = await Promise.all([
      consumePasswordReset(token, "NeuesPasswort2026!x"),
      consumePasswordReset(token, "AnderesPasswort2026!y"),
    ]);
    const okCount = [a, b].filter((r) => r.ok).length;
    expect(okCount).toBe(1);

    // Token ist verbraucht, dritter Versuch scheitert ebenfalls
    const c = await consumePasswordReset(token, "Drittes2026!z");
    expect(c.ok).toBe(false);
  });

  it("DB-Fehler in der Transaktion verbrennt den Token NICHT (kein Failure-Window)", async () => {
    const user = await createUser({ name: "Robust" });
    const token = generateToken();
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3_600_000) },
    });

    // Claim + Passwort + Session-Revoke laufen in EINER Transaktion – schlägt
    // sie fehl (Rollback), ist usedAt nicht gesetzt und der Token bleibt nutzbar.
    const spy = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error("DB weg"));
    const failed = await consumePasswordReset(token, "NeuesPasswort2026!a");
    expect(failed.ok).toBe(false);
    spy.mockRestore();

    const row = await db.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.usedAt).toBeNull();

    // Danach funktioniert derselbe Token ganz normal – genau einmal.
    expect((await consumePasswordReset(token, "NeuesPasswort2026!b")).ok).toBe(true);
    expect((await consumePasswordReset(token, "NeuesPasswort2026!c")).ok).toBe(false);
  });

  it("erfolgreicher Reset widerruft alle aktiven Sessions des Benutzers", async () => {
    const user = await createUser({ name: "Sessionreich" });
    await db.session.create({
      data: { userId: user.id, tokenHash: `th-${user.id}`, expiresAt: new Date(Date.now() + 3_600_000) },
    });
    const token = generateToken();
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3_600_000) },
    });
    expect((await consumePasswordReset(token, "NeuesPasswort2026!d")).ok).toBe(true);
    const sessions = await db.session.findMany({ where: { userId: user.id } });
    expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);
  });

  it("abgelaufene und fremd-inaktive Tokens werden abgelehnt", async () => {
    const user = await createUser({ name: "Abgelaufen" });
    const token = generateToken();
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await consumePasswordReset(token, "Egal2026!abc")).ok).toBe(false);

    const inactive = await createUser({ name: "Deaktiviert" });
    await db.user.update({ where: { id: inactive.id }, data: { active: false } });
    const token2 = generateToken();
    await db.passwordResetToken.create({
      data: { userId: inactive.id, tokenHash: hashToken(token2), expiresAt: new Date(Date.now() + 3_600_000) },
    });
    expect((await consumePasswordReset(token2, "Egal2026!abc")).ok).toBe(false);
  });
});
