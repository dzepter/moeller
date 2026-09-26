import { createHash, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** 32 Byte Zufall, URL-sicher kodiert – für Sessions, Magic Links, Reset-Tokens. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Kurzer, gut lesbarer Code (Empfehlungslinks). */
export function generateCode(length = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne I/O/0/1
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[(bytes[i] as number) % alphabet.length];
  return out;
}

/** Peppered SHA-256 – für Token-Hashes in der DB (Sessions, Magic Links, Resets). */
export function hashToken(token: string): string {
  return createHash("sha256").update(`${env.sessionPepper}:${token}`).digest("hex");
}

/** Gesalzener Hash für IP-Adressen (Rate Limiting) – nie Roh-IP speichern. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`ip:${env.sessionPepper}:${ip}`).digest("hex").slice(0, 32);
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// ---- AES-256-GCM für ruhende Geheimnisse (TOTP-Secrets) ----

function encryptionKey(): Buffer {
  const hex = env.encryptionKey;
  // 64 Hex-Zeichen → 32 Byte; Dev-Fallback wird gehasht
  if (/^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, "hex");
  return createHash("sha256").update(hex).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Ungültiges Secret-Format");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
