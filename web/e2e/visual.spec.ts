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

    // Compare outer and inner header geometry between local and CI.
    // A difference in the wrapper can move the hero heading even when fonts match.
    const headerStyles = await page
      .locator("header")
      .first()
      .evaluate((header) => {
        const inspect = (element: Element | null) => {
          if (!(element instanceof HTMLElement)) return null;

          const styles = getComputedStyle(element);
          const rect = element.getBoundingClientRect();

          return {
            tagName: element.tagName.toLowerCase(),
            className: element.getAttribute("class"),
            top: rect.top,
            left: rect.left,
            height: rect.height,
            width: rect.width,
            paddingTop: styles.paddingTop,
            paddingRight: styles.paddingRight,
            paddingBottom: styles.paddingBottom,
            paddingLeft: styles.paddingLeft,
            marginTop: styles.marginTop,
            marginBottom: styles.marginBottom,
            borderTopWidth: styles.borderTopWidth,
            borderBottomWidth: styles.borderBottomWidth,
            minHeight: styles.minHeight,
            cssHeight: styles.height,
            boxSizing: styles.boxSizing,
            position: styles.position,
            display: styles.display,
            alignItems: styles.alignItems,
            gap: styles.gap,
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            lineHeight: styles.lineHeight,
          };
        };

        return {
          header: inspect(header),
          firstChild: inspect(header.firstElementChild),
          navigation: inspect(header.querySelector("nav")),
          firstLink: inspect(header.querySelector("a")),
          firstButton: inspect(header.querySelector("button")),
        };
      });

    console.log(
      `[Header Styles][${testInfo.project.name}]`,
      JSON.stringify(headerStyles, null, 2),
    );

    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: true,
    });
  });
}
