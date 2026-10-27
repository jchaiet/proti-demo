import { expect, test } from "@playwright/test";

test("published pages provide an early connection hint for Sanity images", async ({
  page,
}) => {
  await page.goto("/products/widget");

  await expect(
    page.locator('head link[rel="preconnect"][href="https://cdn.sanity.io"]'),
  ).toHaveCount(1);
});
