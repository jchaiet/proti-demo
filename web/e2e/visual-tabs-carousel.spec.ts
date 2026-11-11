import { expect, test, type Locator, type Page } from "@playwright/test";

const fixtureMode = process.env.PROTI_VISUAL_FIXTURES === "1";
const projects = ["chromium-desktop", "chromium-mobile"];

function trackSanityRequests(page: Page): string[] {
  const requests: string[] = [];
  page.on("request", (request) => {
    try {
      const host = new URL(request.url()).hostname;
      if (host === "sanity.io" || host.endsWith(".sanity.io")) {
        requests.push(request.url());
      }
    } catch {
      // Ignore non-network URLs.
    }
  });
  return requests;
}

async function ready(page: Page, name: "tabs" | "carousel") {
  const response = await page.goto(`/visual-fixtures/${name}`, {
    waitUntil: "load",
  });
  expect(response?.status()).toBe(200);

  const fixture = page.locator(`main[data-visual-fixture="${name}"]`);
  await expect(fixture).toBeVisible();
  await expect(page.locator("nextjs-portal")).toHaveCount(0);

  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  return fixture;
}

async function screenshot(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
}

for (const name of ["tabs", "carousel"] as const) {
  test(`${name} route is disabled without explicit opt-in`, async ({
    page,
  }) => {
    test.skip(
      fixtureMode,
      "Run with PROTI_VISUAL_FIXTURES unset to verify 404",
    );
    const response = await page.goto(`/visual-fixtures/${name}`);
    expect(response?.status()).toBe(404);
  });
}

test("Tabs: default, selected, and keyboard-selected visuals", async ({
  page,
}, testInfo) => {
  test.skip(!fixtureMode, "Set PROTI_VISUAL_FIXTURES=1 for visual fixtures");
  test.skip(
    !projects.includes(testInfo.project.name),
    "Chromium visual projects only",
  );

  const sanityRequests = trackSanityRequests(page);
  const fixture = await ready(page, "tabs");
  await expect(fixture.getByText("Explore component states")).toBeVisible();

  // The production TabsBlock is expected to expose accessible tab roles and
  // aria-selected. Failure here identifies an accessibility regression rather
  // than silently using a class-based implementation selector.
  const overview = fixture.getByRole("tab", { name: /Overview/i });
  const details = fixture.getByRole("tab", { name: /Details/i });
  const accessibility = fixture.getByRole("tab", { name: /Accessibility/i });

  await expect(overview).toHaveCount(1);
  await expect(details).toHaveCount(1);
  await expect(accessibility).toHaveCount(1);
  await expect(overview).toHaveAttribute("aria-selected", "true");
  await expect(
    fixture.getByText("Overview panel: stable introductory copy", {
      exact: false,
    }),
  ).toBeVisible();
  await screenshot(page, "tabs-overview.png");

  await details.click();
  await expect(details).toHaveAttribute("aria-selected", "true");
  await expect(overview).toHaveAttribute("aria-selected", "false");
  await expect(
    fixture.getByText("Details panel: longer editorial copy", { exact: false }),
  ).toBeVisible();

  const detailsImage = fixture.getByAltText("Teal tabs illustration");
  await expect(detailsImage).toBeVisible();
  await expect
    .poll(
      () =>
        detailsImage.evaluate((el) => (el as HTMLImageElement).naturalWidth),
      { message: "Local tab illustration did not load" },
    )
    .toBeGreaterThan(0);
  await screenshot(page, "tabs-details.png");

  await accessibility.focus();
  await accessibility.press("Enter");
  await expect(accessibility).toHaveAttribute("aria-selected", "true");
  await expect(details).toHaveAttribute("aria-selected", "false");
  await expect(
    fixture.getByText("Accessibility panel: keyboard navigation", {
      exact: false,
    }),
  ).toBeVisible();
  await screenshot(page, "tabs-accessibility.png");

  expect(sanityRequests, "Tabs fixture must not query Sanity").toEqual([]);
});

// Don't target minified Mino CSS classes. Require a named, keyboard-focusable
// button. If the installed Mino version exposes a different name, report its
// actual controls so the selector can be aligned to the accessible contract.
async function carouselControl(
  carousel: Locator,
  direction: "next" | "previous",
): Promise<Locator> {
  const name =
    direction === "next" ? /\b(next|forward)\b/i : /\b(previous|prev|back)\b/i;
  const control = carousel.getByRole("button", { name }).first();
  if ((await control.count()) === 0) {
    const controls = await carousel
      .locator("button, [role=button]")
      .evaluateAll((els) =>
        els.map((el) => ({
          text: el.textContent?.trim(),
          ariaLabel: el.getAttribute("aria-label"),
          title: el.getAttribute("title"),
          outerHTML: el.outerHTML.slice(0, 400),
        })),
      );
    throw new Error(
      `Cannot find a named ${direction} Carousel button. Actual controls:\n${JSON.stringify(controls, null, 2)}`,
    );
  }
  return control;
}

// Captures layout position and slide identity, independent of how Mino
// animates its track (CSS transforms, scroll snapping, or rerendering items).
async function slideFingerprint(carousel: Locator): Promise<string> {
  return JSON.stringify(
    await carousel.locator('img[alt^="Carousel slide"]').evaluateAll((images) =>
      images.map((img) => ({
        alt: (img as HTMLImageElement).alt,
        left: Math.round(img.getBoundingClientRect().left),
      })),
    ),
  );
}

test("Carousel: initial, next, and previous visuals", async ({
  page,
}, testInfo) => {
  test.skip(!fixtureMode, "Set PROTI_VISUAL_FIXTURES=1 for visual fixtures");
  test.skip(
    !projects.includes(testInfo.project.name),
    "Chromium visual projects only",
  );

  const sanityRequests = trackSanityRequests(page);
  const fixture = await ready(page, "carousel");
  await expect(fixture.getByText("A consistent visual sequence")).toBeVisible();

  const firstImage = fixture
    .getByAltText("Carousel slide one: teal geometry")
    .first();
  await expect(firstImage).toBeVisible();
  await expect
    .poll(
      () => firstImage.evaluate((el) => (el as HTMLImageElement).naturalWidth),
      { message: "Local carousel illustration did not load" },
    )
    .toBeGreaterThan(0);

  await screenshot(page, "carousel-initial.png");
  const initial = await slideFingerprint(fixture);
  expect(initial, "The Carousel must render at least one image").not.toBe("[]");

  const next = await carouselControl(fixture, "next");
  await expect(next).toBeEnabled();
  await next.click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(() => slideFingerprint(fixture), {
      message: "Next must move to a different Carousel visual state",
    })
    .not.toBe(initial);
  await screenshot(page, "carousel-next.png");

  const previous = await carouselControl(fixture, "previous");
  await expect(previous).toBeEnabled();
  const advanced = await slideFingerprint(fixture);
  await previous.click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(() => slideFingerprint(fixture), {
      message: "Previous must move back toward the initial Carousel state",
    })
    .not.toBe(advanced);
  await screenshot(page, "carousel-return.png");

  expect(sanityRequests, "Carousel fixture must not query Sanity").toEqual([]);
});
