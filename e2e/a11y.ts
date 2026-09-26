import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Gemeinsame Accessibility-Prüfung (axe-core).
 *
 * Ehrliche Aussagekraft: axe deckt WCAG 2.2 AA nur teilweise regelbasiert ab –
 * wir prüfen alle von axe unterstützten Regeln der Tags 2.0/2.1/2.2 (A+AA).
 * Verstöße JEDER Impact-Klasse außer "minor" lassen den Test fehlschlagen;
 * "minor" wird protokolliert statt ignoriert. Die manuelle WCAG-2.2-Checkliste
 * steht in docs/ACCESSIBILITY.md.
 */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  // Eintrittsanimationen sofort beenden, damit axe keine Farben mitten im
  // Opacity-Übergang misst (falsch-positive Kontrastfehler).
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze();

  const minor = results.violations.filter((v) => v.impact === "minor");
  if (minor.length) {
    console.log(
      `[axe] ${page.url()} – minor (nicht blockierend): ${minor.map((v) => `${v.id}(${v.nodes.length})`).join(", ")}`,
    );
  }
  const relevant = results.violations.filter((v) => v.impact !== "minor");
  expect(
    relevant,
    JSON.stringify(
      relevant.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
      null,
      2,
    ),
  ).toEqual([]);
}
