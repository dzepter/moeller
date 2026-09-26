import { test, expect } from "@playwright/test";

/**
 * Indexierungs-Schutz (Addendum-Testliste): Academy- und Admin-Seiten dürfen
 * von Suchmaschinen nicht erfasst werden. Prüft alle drei Schutzschichten:
 * X-Robots-Tag-Header, robots-Meta und robots.txt.
 */
test.describe("SEO / Nicht-Indexierbarkeit", () => {
  test("Academy ist auf allen drei Ebenen von der Indexierung ausgeschlossen", async ({ page, request }) => {
    const res = await request.get("/academy");
    expect(res.status()).toBe(200);
    expect(res.headers()["x-robots-tag"] ?? "").toContain("noindex");

    await page.goto("/academy");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    const robots = await request.get("/robots.txt");
    const text = await robots.text();
    expect(text).toContain("Disallow: /academy");
    expect(text).toContain("Disallow: /admin");
  });

  test("Admin-Login trägt noindex (Header + Meta)", async ({ page, request }) => {
    const res = await request.get("/admin/login");
    expect(res.headers()["x-robots-tag"] ?? "").toContain("noindex");
    await page.goto("/admin/login");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
