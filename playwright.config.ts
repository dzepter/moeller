import { defineConfig, devices } from "@playwright/test";

/**
 * E2E-Tests laufen gegen den Production-Build (standalone) mit der
 * geseedeten Entwicklungs-Datenbank.
 * Vorbereitung: npm run build && npm run e2e:prepare  (siehe README)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3200",
    trace: "retain-on-failure",
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // RATE_LIMIT_DISABLED gilt nur für Tests und wird produktiv ignoriert (env.rateLimitDisabled)
    command: "PORT=3200 RATE_LIMIT_DISABLED=true node .next/standalone/server.js",
    url: "http://localhost:3200",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
