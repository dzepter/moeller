import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/crypto";
import { env } from "@/lib/env";

export const SESSION_COOKIE = env.isProd ? "__Host-session" : "session";

const IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 h
const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

export async function createSession(userId: string, opts?: { mfaPending?: boolean; userAgent?: string | null }) {
  const token = generateToken();
  const session = await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + IDLE_TIMEOUT_MS),
      mfaPending: opts?.mfaPending ?? false,
      userAgent: opts?.userAgent?.slice(0, 250) ?? null,
    },
  });
  return { token, session };
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_TIMEOUT_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/", maxAge: 0 });
}

/** Aktive Session inkl. User + Rollen + Permissions laden (request-gecacht). */
export const getSession = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          region: true,
          roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        },
      },
    },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (!session.user.active) return null;
  if (Date.now() - session.createdAt.getTime() > ABSOLUTE_TIMEOUT_MS) return null;

  // Idle-Timeout verlängern (höchstens einmal pro Minute schreiben)
  if (Date.now() - session.lastSeenAt.getTime() > 60_000) {
    await db.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + IDLE_TIMEOUT_MS) },
    });
  }
  return session;
});

export async function completeMfa(sessionId: string): Promise<void> {
  await db.session.update({ where: { id: sessionId }, data: { mfaPending: false } });
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await db.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
}
