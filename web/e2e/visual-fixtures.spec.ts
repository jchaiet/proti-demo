import { expect, test } from "@playwright/test";

const fixturePath = "/visual-fixtures/hero";
const fixtureMode = process.env.PROTI_VISUAL_FIXTURES === "1";

/**
 * Verify that visual fixture routes are unavailable unless explicitly enabled.
 */
test("visual fixture routes return 404 without explicit opt-in", async ({
  page,
}) => {
  test.skip(fixtureMode, "This test runs only when fixtures are disabled");

  const response = await page.goto(fixturePath);

  expect(response?.status()).toBe(404);
});

/**
 * Verify that the Hero fixture renders through the real Proti components
 * without depending on live Sanity content.
 */
test("Hero fixture visual baseline", async ({ page }, testInfo) => {
  test.skip(
    !fixtureMode,
    "Set PROTI_VISUAL_FIXTURES=1 to run fixture screenshots",
  );

  test.skip(
    !["chromium-desktop", "chromium-mobile"].includes(testInfo.project.name),
    "Fixture screenshots use Chromium desktop/mobile only",
  );

  // Track unexpected Sanity API requests.
  const cmsRequests: string[] = [];

  page.on("request", (request) => {
    if (/\.api\.sanity\.io\//.test(request.url())) {
      cmsRequests.push(request.url());
    }
  });

  // Navigate to the fixture page.
  const response = await page.goto(fixturePath, {
    waitUntil: "load",
  });

  expect(response?.status()).toBe(200);

  // Verify the fixture container.
  const fixture = page.locator('main[data-visual-fixture="hero"]');

  await expect(fixture).toBeVisible();

  // Verify Hero content.
  await expect(fixture.getByText("Build confidently with Proti")).toBeVisible();

  await expect(fixture.getByText("PROTI VISUAL REGRESSION")).toBeVisible();

  // Verify the CTA is rendered as an anchor with the expected destination.
  // Avoid getByRole("link") because Mino UI's Button component
  // may assign a different accessibility role.
  const heroCta = fixture.locator('a[href="#fixture-details"]');

  await expect(heroCta).toBeVisible();

  await expect(heroCta).toContainText("Explore the fixture");

  // Verify the anchor destination exists.
  await expect(page.locator("#fixture-details")).toHaveCount(1);

  // Verify that no Next.js development overlay is present.
  await expect(page.locator("nextjs-portal")).toHaveCount(0);

  // Wait for fonts to finish loading before capturing screenshots.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  // Fixture rendering should not query the Sanity API.
  expect(cmsRequests, "Fixture page must not request the Sanity API").toEqual(
    [],
  );

  // Capture and compare the full-page screenshot.
  await expect(page).toHaveScreenshot("hero.png", {
    fullPage: true,
  });
});
