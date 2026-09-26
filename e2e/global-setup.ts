import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { generateSecret } from "otplib";
import { encryptSecret } from "../src/lib/crypto";

/**
 * Legt deterministische E2E-Benutzer an (Passwort bekannt, kein erzwungener
 * Passwortwechsel). Läuft gegen die in DATABASE_URL konfigurierte (Dev-)DB.
 *
 * - e2e-admin: MIT eingerichteter MFA (Secret wird über process.env an die
 *   Tests gereicht, damit der echte TOTP-Login-Pfad durchlaufen wird).
 * - e2e-admin-ohne-mfa: Administrator OHNE MFA – für den Test des zentralen
 *   MFA-Pflicht-Gates (direkter Aufruf von /admin/… muss zur Einrichtung führen).
 * - e2e-innendienst: Standard-Arbeitskonto der Flows.
 */
export default async function globalSetup(): Promise<void> {
  const db = new PrismaClient();
  const passwordHash = await hash("E2e!Passwort2026", { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  async function upsertUser(
    email: string,
    name: string,
    roleKey: string,
    mfa?: { secretEnc: string },
  ) {
    const role = await db.role.findUnique({ where: { key: roleKey } });
    if (!role) throw new Error(`Rolle ${roleKey} fehlt – bitte zuerst \`npm run seed\` ausführen.`);
    const mfaData = mfa
      ? { mfaSecretEnc: mfa.secretEnc, mfaEnabledAt: new Date() }
      : { mfaSecretEnc: null, mfaEnabledAt: null };
    const user = await db.user.upsert({
      where: { email },
      update: { passwordHash, mustChangePassword: false, active: true, ...mfaData },
      create: { email, name, passwordHash, mustChangePassword: false, ...mfaData },
    });
    await db.userRole.deleteMany({ where: { userId: user.id } });
    await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }

  const adminTotpSecret = generateSecret({ length: 20 });
  process.env.E2E_ADMIN_TOTP_SECRET = adminTotpSecret;

  await upsertUser("e2e-innendienst@test.local", "E2E Innendienst", "INNENDIENST");
  await upsertUser("e2e-admin@test.local", "E2E Admin", "ADMINISTRATOR", {
    secretEnc: encryptSecret(adminTotpSecret),
  });
  await upsertUser("e2e-admin-ohne-mfa@test.local", "E2E Admin ohne MFA", "ADMINISTRATOR");
  await db.$disconnect();
}
