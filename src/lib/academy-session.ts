import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { env } from "@/lib/env";

/**
 * Academy-Zugang: Der Magic-Link-Token wird nach dem ersten Öffnen in einem
 * httpOnly-Cookie gehalten (Token selbst, DB speichert nur den Hash).
 */

const COOKIE = "academy_token";

export async function setAcademyCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

/** Gültige Academy-Session (Einladung nicht widerrufen/abgelaufen) laden. */
export const getAcademySession = cache(async () => {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const invitation = await db.trainingInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      assignment: {
        include: {
          candidate: { select: { id: true, firstName: true, anonymizedAt: true } },
          courseVersion: { include: { course: true } },
          completion: true,
        },
      },
    },
  });
  if (!invitation || invitation.revokedAt || invitation.expiresAt < new Date()) return null;
  if (invitation.assignment.candidate.anonymizedAt) return null;
  return invitation;
});
