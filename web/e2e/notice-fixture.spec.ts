import { expect, test } from "@playwright/test";

const path = "/visual-fixtures/notice";
const fixturesEnabled = process.env.PROTI_VISUAL_FIXTURES === "1";

test("Notice fixture is 404 without opt-in", async ({ page }) => {
  test.skip(fixturesEnabled);
  const response = await page.goto(path);
  expect(response?.status()).toBe(404);
});

test("Notice fixture preserves content semantics", async ({ page }) => {
  test.skip(!fixturesEnabled);
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);

  const content = page.locator('main[data-visual-fixture="notice"]');
  await expect(content.getByText("A useful notice")).toBeVisible();
  await expect(content.getByText("Discover more with Proti")).toBeVisible();
  // Persistent content must not announce itself as a new alert on page load.
  await expect(content.locator('[role="alert"], [aria-live]')).toHaveCount(0);
});
