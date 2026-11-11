import { expect, test } from "@playwright/test";

const fixtureMode = process.env.PROTI_VISUAL_FIXTURES === "1";
const scenarios = [
  {
    name: "Content",
    slug: "content",
    selector: "content",
    title: "Content that stays consistent",
  },
  {
    name: "Rich Text",
    slug: "rich-text",
    selector: "rich-text",
    title: "Portable Text rendering",
  },
] as const;

for (const scenario of scenarios) {
  const path = `/visual-fixtures/${scenario.slug}`;

  test(`${scenario.name} fixture is disabled without opt-in`, async ({
    page,
  }) => {
    test.skip(fixtureMode, "Test route gating with the fixture flag disabled");
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  });

  test(`${scenario.name} fixture visual baseline`, async ({
    page,
  }, testInfo) => {
    test.skip(
      !fixtureMode,
      "Set PROTI_VISUAL_FIXTURES=1 for fixture screenshots",
    );
    test.skip(
      !["chromium-desktop", "chromium-mobile"].includes(testInfo.project.name),
      "Fixture screenshots run in Chromium desktop and mobile only",
    );

    const cmsRequests: string[] = [];
    page.on("request", (request) => {
      if (/\.api\.sanity\.io\//.test(request.url()))
        cmsRequests.push(request.url());
    });

    const response = await page.goto(path, { waitUntil: "load" });
    expect(response?.status()).toBe(200);

    const fixture = page.locator(
      `main[data-visual-fixture="${scenario.selector}"]`,
    );
    await expect(fixture).toBeVisible();
    await expect(fixture.getByText(scenario.title)).toBeVisible();

    if (scenario.slug === "content") {
      await expect(fixture.getByText("PROTI CONTENT FIXTURE")).toBeVisible();
      await expect(
        fixture.locator('[data-block-background="surface"]'),
      ).toHaveCount(1);
    } else {
      await expect(
        fixture.getByText("Stable editorial typography"),
      ).toBeVisible();
      await expect(fixture.locator("strong")).toContainText("strong emphasis");
      await expect(fixture.locator("em")).toContainText("italic emphasis");
      await expect(fixture.locator("li")).toHaveCount(2);
      await expect(fixture.locator("blockquote")).toContainText(
        "Predictable content makes visual regressions meaningful.",
      );
    }

    await expect(page.locator("nextjs-portal")).toHaveCount(0);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    expect(
      cmsRequests,
      "Fixture pages must not request the Sanity API",
    ).toEqual([]);
    await expect(page).toHaveScreenshot(`${scenario.slug}.png`, {
      fullPage: true,
    });
  });
}
