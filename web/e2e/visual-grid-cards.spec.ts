import { expect, test } from "@playwright/test";

const fixtureMode = process.env.PROTI_VISUAL_FIXTURES === "1";
const scenarios = [
  {
    slug: "grid",
    title: "Single-column reference",
    other: "Mixed cards at desktop width",
    imageAlts: [
      "Teal geometric tile",
      "Blue geometric tile",
      "Coral shapes for the patterns article",
      "Blue shapes for the layout resource",
    ],
  },
  {
    slug: "cards",
    title: "Article card variants",
    other: "Resource card variants",
    imageAlts: [
      "Coral abstract article illustration",
      "Teal abstract article illustration",
      "Blue abstract resource illustration",
    ],
  },
] as const;

for (const scenario of scenarios) {
  const path = `/visual-fixtures/${scenario.slug}`;

  test(`${scenario.slug} route is disabled without explicit opt-in`, async ({
    page,
  }) => {
    test.skip(
      fixtureMode,
      "Run this security check without PROTI_VISUAL_FIXTURES=1",
    );
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  });

  test(`${scenario.slug} deterministic visual baseline`, async ({
    page,
  }, testInfo) => {
    test.skip(
      !fixtureMode,
      "Set PROTI_VISUAL_FIXTURES=1 for fixture screenshots",
    );
    test.skip(
      !["chromium-desktop", "chromium-mobile"].includes(testInfo.project.name),
      "Fixture screenshots are Chromium desktop/mobile only",
    );

    const sanityRequests: string[] = [];
    page.on("request", (request) => {
      try {
        const hostname = new URL(request.url()).hostname;
        if (hostname === "sanity.io" || hostname.endsWith(".sanity.io")) {
          sanityRequests.push(request.url());
        }
      } catch {
        // Non-HTTP URLs (if any) are irrelevant to the Sanity network check.
      }
    });

    const response = await page.goto(path, { waitUntil: "load" });
    expect(response?.status()).toBe(200);

    const fixture = page.locator(
      `main[data-visual-fixture="${scenario.slug}"]`,
    );
    await expect(fixture).toBeVisible();
    await expect(fixture.getByText(scenario.title)).toBeVisible();
    await expect(fixture.getByText(scenario.other)).toBeVisible();

    // Check by meaningful alt text rather than raw src attributes. Next.js may
    // legitimately rewrite the local SVG URL through its image pipeline.
    for (const alt of scenario.imageAlts) {
      const image = fixture.getByAltText(alt);
      await expect(image).toBeVisible();
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(
          () =>
            image.evaluate(
              (element) => (element as HTMLImageElement).naturalWidth,
            ),
          { message: `Local fixture image failed to load: ${alt}` },
        )
        .toBeGreaterThan(0);
    }

    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });

    await expect(page.locator("nextjs-portal")).toHaveCount(0);
    expect(
      sanityRequests,
      "Fixture pages must not request live Sanity content",
    ).toEqual([]);

    await expect(page).toHaveScreenshot(`${scenario.slug}.png`, {
      fullPage: true,
    });
  });
}
