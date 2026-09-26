import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

/**
 * Legt deterministische E2E-Benutzer an (Passwort bekannt, kein erzwungener
 * Passwortwechsel). Läuft gegen die in DATABASE_URL konfigurierte (Dev-)DB.
 */
export default async function globalSetup(): Promise<void> {
  const db = new PrismaClient();
  const passwordHash = await hash("E2e!Passwort2026", { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  async function upsertUser(email: string, name: string, roleKey: string) {
    const role = await db.role.findUnique({ where: { key: roleKey } });
    if (!role) throw new Error(`Rolle ${roleKey} fehlt – bitte zuerst \`npm run seed\` ausführen.`);
    const user = await db.user.upsert({
      where: { email },
      update: { passwordHash, mustChangePassword: false, active: true, mfaSecretEnc: null, mfaEnabledAt: null },
      create: { email, name, passwordHash, mustChangePassword: false },
    });
    await db.userRole.deleteMany({ where: { userId: user.id } });
    await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }

  await upsertUser("e2e-innendienst@test.local", "E2E Innendienst", "INNENDIENST");
  await upsertUser("e2e-admin@test.local", "E2E Admin", "ADMINISTRATOR");
  await db.$disconnect();
}
