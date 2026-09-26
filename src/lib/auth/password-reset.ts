import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { hashPassword } from "@/lib/auth/password";
import { audit } from "@/lib/audit";

const INVALID = "Dieser Link ist nicht mehr gültig. Bitte fordere einen neuen an.";

/**
 * Verbraucht einen Passwort-Reset-Token concurrency-sicher UND ohne
 * Failure-Window: Der Passwort-Hash wird VOR dem Claim berechnet; Claim
 * (bedingtes usedAt-Update), Passwortänderung und Session-Widerruf laufen
 * anschließend in EINER Transaktion. Bei zwei parallelen Requests gewinnt
 * genau einer (usedAt IS NULL + expiresAt > now als Bedingung); scheitert
 * irgendein Schritt, rollt die Transaktion vollständig zurück – der Token
 * ist dann NICHT verbrannt und bleibt nutzbar.
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

  // Teuren Hash außerhalb der Transaktion berechnen – ein Hash-Fehler kann
  // so von vornherein keinen Token verbrauchen.
  const passwordHash = await hashPassword(newPassword);

  let claimed = false;
  try {
    await db.$transaction(async (tx) => {
      const claim = await tx.passwordResetToken.updateMany({
        where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claim.count !== 1) return; // verloren/abgelaufen → nichts geändert
      claimed = true;
      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash, mustChangePassword: false },
      });
      await tx.session.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
  } catch (err) {
    // Transaktion zurückgerollt: usedAt ist NICHT gesetzt, Token bleibt gültig.
    console.error("[password-reset] Transaktion fehlgeschlagen – Token bleibt nutzbar:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Das hat gerade nicht geklappt. Bitte versuche es erneut." };
  }
  if (!claimed) return { ok: false, error: INVALID };

  await audit({ action: "auth.password.reset.completed", actorId: reset.userId });
  return { ok: true, userId: reset.userId };
}
