import { execSync } from "node:child_process";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://moeller:moeller_dev@localhost:5432/moeller_test?schema=public";

/** Schema in die Test-Datenbank pushen (einmal pro Testlauf). */
export default function globalSetup(): void {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
}
