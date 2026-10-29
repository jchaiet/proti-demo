import { expect, test } from "@playwright/test";

import { getE2ERoutes } from "./helpers/routes";

const routes = getE2ERoutes();

for (const route of routes) {
  test(`${route.name} visual baseline`, async ({ page }, testInfo) => {
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

    await expect(
      page.locator("nextjs-portal"),
      "Visual baselines must not include the Next.js development overlay",
    ).toHaveCount(0);

    const typography = await page.evaluate(() => {
      const inspect = (selector: string) => {
        const element = document.querySelector(selector);

        if (!element) return null;

        const styles = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return {
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          letterSpacing: styles.letterSpacing,
          top: rect.top,
          left: rect.left,
          height: rect.height,
        };
      };

      return {
        heading: inspect("main h1"),
        navigation: inspect("header"),
        footer: inspect("footer"),

        fonts: Array.from(document.fonts).map((font) => ({
          family: font.family,
          weight: font.weight,
          status: font.status,
        })),
      };
    });

    console.log("[Visual typography]", JSON.stringify(typography, null, 2));

    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: true,
    });
  });
}
