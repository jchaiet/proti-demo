import { expect, test } from "@playwright/test";

/**
 * GridBlock should reserve tile layout before its lazy images load.
 * We intentionally block both fixture SVG responses to make the check deterministic.
 * The image wrapper, rather than the image itself, owns the reserved geometry.
 */
test("Grid image tiles reserve space before loading", async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.PROTI_VISUAL_FIXTURES !== "1",
    "Build with PROTI_VISUAL_FIXTURES=1 to test layout stability",
  );
  test.skip(
    !["chromium-desktop", "chromium-mobile"].includes(testInfo.project.name),
    "CLS baseline is measured on Chromium desktop/mobile",
  );

  let releaseImages!: () => void;
  const imagesMayLoad = new Promise<void>((resolve) => {
    releaseImages = resolve;
  });

  await page.route(
    /\/visual-fixtures\/assets\/(?:grid-pattern|resource-cover)\.svg(?:\?.*)?$/,
    async (route) => {
      await imagesMayLoad;
      await route.continue();
    },
  );

  const response = await page.goto("/visual-fixtures/grid", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(200);

  const firstTile = page.getByAltText("Teal geometric tile");
  const secondTile = page.getByAltText("Blue geometric tile");
  const followingSection = page.locator(
    'main[data-visual-fixture="grid"] > [data-block-background="canvas"]',
  );

  await expect(firstTile).toBeAttached();
  await expect(secondTile).toBeAttached();
  await expect(followingSection).toBeAttached();

  // Avoid mistakenly attributing late font/style initialization to the image.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  // Mino's image wrapper directly contains the <img> (confirmed by the
  // Lighthouse DOM selector). Its geometry must exist before any SVG loads.
  const firstWrapper = firstTile.locator("xpath=..");
  const secondWrapper = secondTile.locator("xpath=..");

  await expect
    .poll(
      () => firstWrapper.evaluate((el) => el.getBoundingClientRect().height),
      {
        message:
          "First Grid image wrapper should reserve height before image load",
      },
    )
    .toBeGreaterThan(150);
  await expect
    .poll(
      () => secondWrapper.evaluate((el) => el.getBoundingClientRect().height),
      {
        message:
          "Second Grid image wrapper should reserve height before image load",
      },
    )
    .toBeGreaterThan(150);

  const before = await page.evaluate(() => {
    const first = document.querySelector<HTMLImageElement>(
      'img[alt="Teal geometric tile"]',
    );
    const second = document.querySelector<HTMLImageElement>(
      'img[alt="Blue geometric tile"]',
    );
    const section = document.querySelector<HTMLElement>(
      'main[data-visual-fixture="grid"] > [data-block-background="canvas"]',
    );
    if (!first?.parentElement || !second?.parentElement || !section) {
      throw new Error("Grid fixture markup changed");
    }
    return {
      firstWrapperHeight: first.parentElement.getBoundingClientRect().height,
      secondWrapperHeight: second.parentElement.getBoundingClientRect().height,
      sectionTop: section.getBoundingClientRect().top + window.scrollY,
    };
  });

  releaseImages();

  await Promise.all([
    firstTile.evaluate((el) => (el as HTMLImageElement).decode()),
    secondTile.evaluate((el) => (el as HTMLImageElement).decode()),
  ]);

  const after = await page.evaluate(() => {
    const first = document.querySelector<HTMLImageElement>(
      'img[alt="Teal geometric tile"]',
    );
    const second = document.querySelector<HTMLImageElement>(
      'img[alt="Blue geometric tile"]',
    );
    const section = document.querySelector<HTMLElement>(
      'main[data-visual-fixture="grid"] > [data-block-background="canvas"]',
    );
    if (!first?.parentElement || !second?.parentElement || !section) {
      throw new Error("Grid fixture markup changed");
    }
    return {
      firstWrapperHeight: first.parentElement.getBoundingClientRect().height,
      secondWrapperHeight: second.parentElement.getBoundingClientRect().height,
      sectionTop: section.getBoundingClientRect().top + window.scrollY,
    };
  });

  // Detect movement of both image wrappers and the content below them.
  expect(
    Math.abs(after.firstWrapperHeight - before.firstWrapperHeight),
  ).toBeLessThan(2);
  expect(
    Math.abs(after.secondWrapperHeight - before.secondWrapperHeight),
  ).toBeLessThan(2);
  expect(Math.abs(after.sectionTop - before.sectionTop)).toBeLessThan(2);
});
