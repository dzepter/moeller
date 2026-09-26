import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://moeller:moeller_dev@localhost:5432/moeller_test?schema=public";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    // DB-Tests laufen seriell gegen eine gemeinsame Test-Datenbank
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      APP_BASE_URL: "http://localhost:3000",
      EMAIL_PROVIDER: "log",
      STORAGE_PROVIDER: "local",
      STORAGE_LOCAL_ROOT: "./var/test-uploads",
      SESSION_PEPPER: "test_pepper",
      APP_ENCRYPTION_KEY: "test_only_00000000000000000000000000000000000000000000000000000000",
      SCHEDULER_ENABLED: "false",
    },
  },
});
