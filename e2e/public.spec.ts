import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Öffentliche Kernflüsse + Accessibility (axe, WCAG 2.x A/AA). */

async function expectNoSeriousA11yViolations(page: import("@playwright/test").Page) {
  // Eintrittsanimationen sofort beenden, damit axe keine Farben mitten im
  // Opacity-Übergang misst (falsch-positive Kontrastfehler).
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, nodes: v.nodes.length })), null, 2)).toEqual([]);
}

test.describe("Öffentliche Website", () => {
  test("Startseite: rendert, ist barrierearm, führt zu Jobs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Menschen");
    await expectNoSeriousA11yViolations(page);

    // Jobfinder: Region wählen → Jobliste
    await page.getByRole("button", { name: "NRW", exact: true }).click();
    await page.getByRole("button", { name: "Jobs anzeigen" }).click();
    await page.waitForURL("**/jobs?bundesland=NRW");
    await expect(page.getByText("für Deine Auswahl")).toBeVisible();
  });

  test("Jobliste + Filter + Jobdetail sind barrierearm", async ({ page }) => {
    await page.goto("/jobs");
    await expectNoSeriousA11yViolations(page);
    await page.getByRole("link", { name: /Promotor \(m\/w\/d\) Lebensmitteleinzelhandel/ }).click();
    await page.waitForURL("**/jobs/promotor-leh-nrw");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Promotor");
    // JobPosting-JSON-LD vorhanden
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toContain('"JobPosting"');
    await expectNoSeriousA11yViolations(page);
  });

  test("Bewerbung in 2 Minuten: absenden → Danke-Seite → Eingang im System", async ({ page }) => {
    const unique = Date.now().toString(36);
    await page.goto("/jobs/promotor-elektrofachmarkt-hessen");
    await page.fill("#f-firstName", "E2E");
    await page.fill("#f-lastName", `Bewerber-${unique}`);
    await page.fill("#f-city", "Frankfurt");
    await page.selectOption("#f-bundesland", "HESSEN");
    await page.locator('input[name="driversLicense"][value="ja"]').check({ force: true });
    await page.fill("#f-previousActivity", "Gastronomie");
    await page.fill("#f-availableFrom", "sofort");
    await page.fill("#f-phone", "0170 9999999");
    await page.fill("#f-email", `e2e-${unique}@example.com`);
    await page.check("#f-consent");
    await page.waitForTimeout(3200); // Bot-Zeitfalle
    await page.getByRole("button", { name: "Bewerbung absenden" }).click();
    await page.waitForURL("**/danke");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Danke");
  });

  test("Formularvalidierung: Fehler sind zugänglich (role=alert)", async ({ page }) => {
    await page.goto("/initiativbewerbung");
    await page.check("#f-consent");
    await page.waitForTimeout(3200);
    await page.getByRole("button", { name: "Bewerbung absenden" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
  });

  test("Empfehlungslink erstellen (Variante A)", async ({ page }) => {
    await page.goto("/empfehlen");
    await expectNoSeriousA11yViolations(page);
    await page.fill("#r-referrerFirstName", "Paula");
    await page.fill("#r-referrerLastName", "Promotorin");
    await page.fill("#r-referrerContact", "paula@example.com");
    await page.getByRole("button", { name: "Empfehlungslink erstellen" }).click();
    await expect(page.getByText("Dein persönlicher Empfehlungslink ist fertig!")).toBeVisible();
    await expect(page.locator("text=/\\/empfehlen\\/[A-Z2-9]{8}/")).toBeVisible();
  });

  test("Chat: Nachricht senden als Besucher", async ({ page }) => {
    await page.goto("/kontakt");
    await page.getByRole("button", { name: /^Chat$/ }).click();
    await page.getByPlaceholder("Deine Nachricht …").fill("Hallo, ist die Stelle in Köln noch frei? (E2E)");
    await page.getByRole("button", { name: "Senden" }).click();
    await expect(page.locator("text=ist die Stelle in Köln noch frei?")).toBeVisible();
  });

  test("404-Seite ist hilfreich", async ({ page }) => {
    const response = await page.goto("/gibt-es-nicht");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Fehler 404")).toBeVisible();
    await expect(page.getByRole("link", { name: "Offene Stellen & Jobs" })).toBeVisible();
  });
});
