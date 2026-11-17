import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Stage 3A: deterministic accessibility checks against the same fixture
 * routes used by v0.5 visual regression. Does not depend on Sanity content.
 *
 * This is intentionally separate from existing screenshot and smoke suites.
 * Add it to CI only after the initial findings have been reviewed and fixed.
 */
const fixtures = [
  "hero",
  "content",
  "rich-text",
  "grid",
  "cards",
  "accordion",
  "tabs",
  "carousel",
  "navigation",
] as const;

const visualFixturesEnabled = process.env.PROTI_VISUAL_FIXTURES === "1";
const chromiumProjects = ["chromium-desktop", "chromium-mobile"];

// Restrict the initial gate to machine-detectable WCAG A/AA rules rather
// than broad best-practice rules. This is not a WCAG conformance claim.
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("Fixture accessibility — automated WCAG A/AA checks", () => {
  for (const fixtureName of fixtures) {
    test(`${fixtureName} has no automatically detected WCAG A/AA violations`, async ({
      page,
    }, testInfo) => {
      test.skip(
        !visualFixturesEnabled,
        "Set PROTI_VISUAL_FIXTURES=1 and rebuild to test fixture pages",
      );
      test.skip(
        !chromiumProjects.includes(testInfo.project.name),
        "Run accessibility baselines on Chromium desktop and mobile",
      );
      test.setTimeout(60_000);

      const response = await page.goto(`/visual-fixtures/${fixtureName}`, {
        waitUntil: "load",
      });
      expect(response?.status()).toBe(200);

      const fixture = page.locator(`[data-visual-fixture="${fixtureName}"]`);
      await expect(fixture).toBeVisible();
      await expect(page.locator("nextjs-portal")).toHaveCount(0);

      // Avoid asynchronous font swaps while analyzing text and contrast.
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      // Intentionally scan the whole document (not just <main>): headings,
      // language, metadata and the header/footer are part of accessibility.
      const results = await new AxeBuilder({ page })
        .withTags(wcagTags)
        .analyze();

      // Keep failure output concise and safe: only the rule, severity, and
      // DOM selector targets. No HTML snippets or content values are saved.
      const violations = results.violations.map((violation) => ({
        rule: violation.id,
        impact: violation.impact,
        help: violation.help,
        targets: violation.nodes.map((node) => node.target),
      }));

      if (violations.length > 0) {
        await testInfo.attach("accessibility-violations.json", {
          body: JSON.stringify(violations, null, 2),
          contentType: "application/json",
        });
      }

      expect(violations).toEqual([]);
    });
  }
});
