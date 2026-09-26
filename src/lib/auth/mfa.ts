import { generateSecret, generateURI, verifySync } from "otplib";
import { createHash, randomBytes } from "node:crypto";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";

export function generateMfaSecret(): { secret: string; encrypted: string } {
  const secret = generateSecret({ length: 20 });
  return { secret, encrypted: encryptSecret(secret) };
}

export function buildOtpAuthUrl(email: string, secret: string): string {
  return generateURI({ issuer: "Möller GmbH Intern", label: email, secret });
}

export function verifyTotp(encryptedSecret: string, token: string): boolean {
  try {
    const secret = decryptSecret(encryptedSecret);
    const result = verifySync({ token: token.replace(/\s/g, ""), secret, epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}

function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(`recovery:${code}`).digest("hex");
}

export function generateRecoveryCodes(count = 10): { plain: string[]; hashes: string[] } {
  const plain = Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { plain, hashes: plain.map(hashRecoveryCode) };
}

/** Verbraucht einen Recovery-Code (einmalige Nutzung). */
export async function consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { recoveryCodeHashes: true } });
  if (!user) return false;
  const h = hashRecoveryCode(code.trim().toUpperCase());
  if (!user.recoveryCodeHashes.includes(h)) return false;
  await db.user.update({
    where: { id: userId },
    data: { recoveryCodeHashes: user.recoveryCodeHashes.filter((x) => x !== h) },
  });
  return true;
}
