import { hash, verify } from "@node-rs/argon2";

// OWASP-empfohlene Argon2id-Parameter
const ARGON_OPTS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 10) return "Das Passwort muss mindestens 10 Zeichen lang sein.";
  if (!/[a-zäöüß]/.test(password) || !/[A-ZÄÖÜ]/.test(password) || !/\d/.test(password)) {
    return "Das Passwort braucht Groß- und Kleinbuchstaben sowie mindestens eine Ziffer.";
  }
  return null;
}
