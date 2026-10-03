import { expect, test } from "@playwright/test";

import { getE2ERoutes } from "./helpers/routes";

const routes = getE2ERoutes();

for (const route of routes) {
  test(`${route.name} visual baseline`, async ({ page }) => {
    const response = await page.goto(route.path, {
      waitUntil: "load",
    });

    expect(
      response,
      `No document response was received for ${route.path}`,
    ).not.toBeNull();

    expect(
      response?.status(),
      `${route.path} returned HTTP ${response?.status()}`,
    ).toBeLessThan(400);

    await expect(page.locator("main")).toBeVisible();

    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: true,
    });
  });
}
