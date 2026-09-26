import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { hashPassword } from "@/lib/auth/password";
import { audit } from "@/lib/audit";

const INVALID = "Dieser Link ist nicht mehr gültig. Bitte fordere einen neuen an.";

/**
 * Verbraucht einen Passwort-Reset-Token concurrency-sicher: Das Beanspruchen
 * (usedAt setzen) ist ein einzelnes bedingtes UPDATE – bei zwei nahezu
 * gleichzeitigen Requests gewinnt genau einer, der zweite erhält „ungültig“.
 */
export async function consumePasswordReset(
  token: string,
  newPassword: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const reset = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { active: true } } },
  });
  if (!reset || !reset.user.active) return { ok: false, error: INVALID };

  // Atomarer Claim: nur EIN Request kann usedAt von NULL auf now() setzen.
  const claimed = await db.passwordResetToken.updateMany({
    where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return { ok: false, error: INVALID };

  await db.$transaction([
    db.user.update({
      where: { id: reset.userId },
      data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
    }),
    db.session.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await audit({ action: "auth.password.reset.completed", actorId: reset.userId });
  return { ok: true, userId: reset.userId };
}
