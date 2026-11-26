import { expect, test } from "@playwright/test";

const path = "/visual-fixtures/metrics";
const fixturesEnabled = process.env.PROTI_VISUAL_FIXTURES === "1";

test("Metrics fixture returns 404 without opt-in", async ({ page }) => {
  test.skip(fixturesEnabled);
  const response = await page.goto(path);
  expect(response?.status()).toBe(404);
});

test("Metrics fixture renders all three static variants responsively", async ({
  page,
}) => {
  test.skip(!fixturesEnabled);
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  const main = page.locator('main[data-visual-fixture="metrics"]');
  await expect(
    main.getByRole("heading", { name: "By the numbers" }),
  ).toBeVisible();
  await expect(main.getByText("Patient satisfaction")).toBeVisible();
  await expect(main.getByText("Access to care")).toBeVisible();
  await expect(main.getByText("Average savings")).toBeVisible();
  await expect(main.locator("li")).toHaveCount(7);
  const viewportWidth = page.viewportSize()?.width ?? 1440;
  const expectedColumns =
    viewportWidth <= 520 ? 1 : viewportWidth <= 767 ? 2 : 3;
  const renderedColumns = await main
    .locator("ul")
    .first()
    .evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(/\s+/).length,
    );
  expect(renderedColumns).toBe(expectedColumns);
  await expect(main.locator('[aria-live], [role="status"]')).toHaveCount(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
