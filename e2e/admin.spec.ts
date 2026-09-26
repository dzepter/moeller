import { test, expect, type Page } from "@playwright/test";

/** Interne Kernflüsse: Bewerbung bearbeiten, Chat beantworten, CMS publizieren, Academy. */

async function login(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "E2e!Passwort2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  // Warten, bis die Login-Seite wirklich verlassen wurde (nicht /admin/login matchen!)
  await page.waitForURL((url) => url.pathname.startsWith("/admin") && !url.pathname.startsWith("/admin/login"), {
    timeout: 20_000,
  });
}

test.describe("Interner Bereich", () => {
  test("Login-Schutz: /admin ohne Session leitet zum Login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL("**/admin/login");
  });

  test("Innendienst: Bewerbung finden, Status setzen, Wiedervorlage anlegen", async ({ page }) => {
    // Eigene Bewerbung anlegen (öffentlicher Flow), damit der Test unabhängig ist
    const unique = Date.now().toString(36);
    await page.goto("/initiativbewerbung");
    await page.fill("#f-firstName", "Admin");
    await page.fill("#f-lastName", `Flow-${unique}`);
    await page.fill("#f-city", "Bonn");
    await page.selectOption("#f-bundesland", "NRW");
    await page.locator('input[name="driversLicense"][value="nein"]').check({ force: true });
    await page.fill("#f-previousActivity", "Logistik");
    await page.fill("#f-availableFrom", "01.12.2026");
    await page.fill("#f-phone", "0171 2222333");
    await page.fill("#f-email", `admin-flow-${unique}@example.com`);
    await page.check("#f-consent");
    await page.waitForTimeout(3200);
    await page.getByRole("button", { name: "Bewerbung absenden" }).click();
    await page.waitForURL("**/danke");

    await login(page, "e2e-innendienst@test.local");

    // In der Liste suchen und öffnen
    await page.goto(`/admin/bewerbungen?q=Flow-${unique}`);
    await page.getByRole("link", { name: `Admin Flow-${unique}` }).click();
    await page.waitForURL(/\/admin\/bewerbungen\/[a-z0-9]+/);

    // Status setzen (stoppt Automatik)
    await page.selectOption("#st-status", "INTERESSENTENGESPRAECH_VEREINBART");
    await page.getByRole("button", { name: "Status setzen" }).click();
    await expect(page.getByText("Gespeichert.").first()).toBeVisible();

    // Wiedervorlage anlegen (das <summary> aufklappen, nicht den Submit-Button treffen)
    await page.locator("summary", { hasText: "Wiedervorlage anlegen" }).click();
    await page.fill("#rm-date", new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
    await page.fill("#rm-subject", "Rückruf E2E");
    await page.getByRole("button", { name: "Wiedervorlage anlegen" }).click();
    await expect(page.getByText("Gespeichert.").nth(1)).toBeVisible();

    // Notiz anlegen
    await page.fill("#nt-body", "Interne Testnotiz (E2E)");
    await page.getByRole("button", { name: "Notiz speichern" }).click();
    await expect(page.getByText("Interne Testnotiz (E2E)")).toBeVisible();
  });

  test("Chat: Besucher-Nachricht erscheint intern und kann beantwortet werden", async ({ page, context }) => {
    const unique = Date.now().toString(36);
    // Besucher schreibt
    await page.goto("/");
    await page.getByRole("button", { name: /^Chat$/ }).click();
    await page.getByPlaceholder("Deine Nachricht …").fill(`E2E-Chatfrage ${unique}`);
    await page.getByRole("button", { name: "Senden" }).click();
    await expect(page.locator(`text=E2E-Chatfrage ${unique}`)).toBeVisible();

    // Innendienst antwortet (eigener Browser-Kontext)
    const adminPage = await context.browser()!.newPage({ baseURL: page.url().split("/").slice(0, 3).join("/") });
    await login(adminPage, "e2e-innendienst@test.local");
    await adminPage.goto("/admin/chats");
    await adminPage.getByRole("link", { name: /Anonymer Besucher/ }).first().click();
    await adminPage.waitForURL(/\/admin\/chats\/[a-z0-9]+/);
    await expect(adminPage.locator(`text=E2E-Chatfrage ${unique}`)).toBeVisible();
    await adminPage.getByPlaceholder("Deine Antwort …").fill("Ja, gerne! (E2E-Antwort)");
    await adminPage.getByRole("button", { name: "Senden" }).click();
    // Die eigene Antwort kommt über das SSE-Echo zurück → großzügiges Timeout
    await expect(adminPage.locator("text=E2E-Antwort")).toBeVisible({ timeout: 20_000 });

    // Besucher sieht die Antwort (SSE oder Polling)
    await expect(page.locator("text=E2E-Antwort")).toBeVisible({ timeout: 20_000 });
    await adminPage.close();
  });

  test("CMS: Administrator ändert Startseiten-Headline und veröffentlicht", async ({ page }) => {
    const unique = Date.now().toString(36);
    await login(page, "e2e-admin@test.local");
    await page.goto("/admin/website/home");
    const headline = `Menschen, die Marken am PoS voranbringen. [${unique}]`;
    await page.fill("#cms-hero-headline", headline);
    await page.getByRole("button", { name: "Speichern & veröffentlichen" }).click();
    await expect(page.getByText("Gespeichert.")).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(`[${unique}]`);

    // Aufräumen: alte Version wiederherstellen (Version 1 = erste)
    await page.goto("/admin/website/home");
    // Original-Headline zurückschreiben und veröffentlichen
    await page.fill("#cms-hero-headline", "Menschen, die Marken am PoS voranbringen.");
    await page.getByRole("button", { name: "Speichern & veröffentlichen" }).click();
    await expect(page.getByText("Gespeichert.")).toBeVisible();
  });

  test("Innendienst sieht den Website-Bereich NICHT (Permission)", async ({ page }) => {
    await login(page, "e2e-innendienst@test.local");
    await page.goto("/admin");
    await expect(page.getByRole("navigation", { name: "Adminbereich" })).not.toContainText("Website");
    // Direktzugriff wird umgeleitet
    await page.goto("/admin/website");
    await page.waitForURL(/\/admin\?fehler=berechtigung/);
  });

  test("Academy: Zusage → Onboarding → Magic Link → Lektion abschließen", async ({ page, context }) => {
    const unique = Date.now().toString(36);
    // Bewerbung anlegen
    await page.goto("/initiativbewerbung");
    await page.fill("#f-firstName", "Academy");
    await page.fill("#f-lastName", `Kandidat-${unique}`);
    await page.fill("#f-city", "Mainz");
    await page.selectOption("#f-bundesland", "RHEINLAND_PFALZ");
    await page.locator('input[name="driversLicense"][value="ja"]').check({ force: true });
    await page.fill("#f-previousActivity", "Verkauf");
    await page.fill("#f-availableFrom", "sofort");
    await page.fill("#f-phone", "0172 3334444");
    await page.fill("#f-email", `academy-${unique}@example.com`);
    await page.check("#f-consent");
    await page.waitForTimeout(3200);
    await page.getByRole("button", { name: "Bewerbung absenden" }).click();
    await page.waitForURL("**/danke");

    await login(page, "e2e-innendienst@test.local");
    await page.goto(`/admin/bewerbungen?q=Kandidat-${unique}`);
    await page.getByRole("link", { name: `Academy Kandidat-${unique}` }).click();
    await page.waitForURL(/\/admin\/bewerbungen\/[a-z0-9]+/);
    await page.selectOption("#st-status", "ZUSAGE");
    await page.getByRole("button", { name: "Status setzen" }).click();
    await expect(page.getByText("Gespeichert.").first()).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Onboarding starten" }).click();
    await expect(page.getByText("Einladung versendet").first()).toBeVisible({ timeout: 20_000 });

    // Magic Link aus dem E-Mail-Log der DB holen (EMAIL_PROVIDER=log)
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();
    const mail = await db.emailLog.findFirst({
      where: { template: "academy-einladung", to: `academy-${unique}@example.com` },
      orderBy: { createdAt: "desc" },
    });
    await db.$disconnect();
    const token = mail?.bodyText.match(/\/academy\/([A-Za-z0-9_-]{20,})/)?.[1];
    expect(token).toBeTruthy();

    // Teilnehmer öffnet Link in frischem Kontext (mobil)
    const learner = await context.browser()!.newPage({ viewport: { width: 390, height: 844 }, baseURL: page.url().split("/").slice(0, 3).join("/") });
    await learner.goto(`/academy/${token}`);
    await learner.waitForURL("**/academy/kurs");
    await expect(learner.getByText("Dein Fortschritt", { exact: true })).toBeVisible();
    await learner.getByRole("link", { name: /Loslegen:/ }).click();
    await learner.getByRole("button", { name: /Lektion abschließen/ }).click();
    await learner.waitForURL(/\/academy\/(lektion|kurs)/);

    // Fortschritt im Admin sichtbar
    await page.goto("/admin/academy");
    await expect(page.getByText(`Academy Kandidat-${unique}`)).toBeVisible();
    await learner.close();
  });
});
