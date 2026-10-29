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

    await page.evaluate(async () => {
      await document.fonts.ready;
    });

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

    console.log(
      `[Visual typography][${testInfo.project.name}]`,
      JSON.stringify(typography, null, 2),
    );

    // Chromium DevTools reports the font files actually used to render text.
    // Computed fontFamily above only reports the CSS fallback stack.
    if (page.context().browser()?.browserType().name() === "chromium") {
      const cdp = await page.context().newCDPSession(page);

      try {
        await cdp.send("DOM.enable");
        await cdp.send("CSS.enable");

        const { root } = await cdp.send("DOM.getDocument");

        for (const selector of [
          "main h1",
          "header",
          "header a",
          "header button",
          "footer",
          "footer a",
        ]) {
          const { nodeId } = await cdp.send("DOM.querySelector", {
            nodeId: root.nodeId,
            selector,
          });

          if (!nodeId) {
            console.log(
              `[Rendered Fonts][${testInfo.project.name}] ${selector}: not found`,
            );
            continue;
          }

          const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", {
            nodeId,
          });

          console.log(
            `[Rendered Fonts][${testInfo.project.name}] ${selector}`,
            JSON.stringify(fonts, null, 2),
          );
        }
      } catch (error) {
        // This is a diagnostic only; screenshot assertions must still run.
        console.warn(
          `[Rendered Fonts][${testInfo.project.name}] diagnostic unavailable`,
          error,
        );
      } finally {
        await cdp.detach();
      }
    }

    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: true,
    });
  });
}
