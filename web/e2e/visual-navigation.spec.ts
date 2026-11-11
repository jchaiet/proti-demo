import { expect, test, type Page } from "@playwright/test";

const fixturePath = "/visual-fixtures/navigation";
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

async function openFixture(page: Page) {
  const response = await page.goto(fixturePath, { waitUntil: "load" });
  expect(response?.status()).toBe(200);

  const fixture = page.locator('[data-visual-fixture="navigation"]');
  await expect(fixture).toBeVisible();
  await expect(fixture.getByRole("main")).toBeVisible();
  await expect(
    fixture.getByRole("heading", { name: "Navigation and footer layouts" }),
  ).toBeVisible();
  await expect(page.locator("nextjs-portal")).toHaveCount(0);

  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  return fixture;
}

async function capture(page: Page, name: string, fullPage = true) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot(name, {
    fullPage,
    animations: "disabled",
    caret: "hide",
  });
}

test("navigation fixture route returns 404 without explicit opt-in", async ({
  page,
}) => {
  test.skip(fixtureMode, "Requires PROTI_VISUAL_FIXTURES to be disabled");
  const response = await page.goto(fixturePath);
  expect(response?.status()).toBe(404);
});

test("Navigation: default header, footer, and responsive layout", async ({
  page,
}, testInfo) => {
  test.skip(
    !fixtureMode,
    "Set PROTI_VISUAL_FIXTURES=1 for fixture screenshots",
  );
  test.skip(
    !projects.includes(testInfo.project.name),
    "Chromium fixtures only",
  );

  const sanityRequests = trackSanityRequests(page);
  const fixture = await openFixture(page);
  const footer = fixture.locator("footer");
  await expect(footer).toBeVisible();
  await expect(footer.getByText("Platform", { exact: true })).toBeVisible();
  await expect(footer.getByText("Resources", { exact: true })).toBeVisible();
  await expect(footer.getByText("Company", { exact: true })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute(
    "href",
    "#fixture-privacy",
  );
  await expect(
    fixture.getByRole("link", { name: "Proti home" }).first(),
  ).toBeVisible();

  if (testInfo.project.name === "chromium-desktop") {
    await expect(
      fixture.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
  } else {
    await expect(
      fixture.getByRole("button", { name: "Open navigation menu" }),
    ).toBeVisible();
  }

  await capture(page, "navigation-default.png");
  expect(sanityRequests, "Navigation fixture must not query Sanity").toEqual(
    [],
  );
});

test("Navigation desktop: megamenu and dropdown visual states", async ({
  page,
}, testInfo) => {
  test.skip(
    !fixtureMode,
    "Set PROTI_VISUAL_FIXTURES=1 for fixture screenshots",
  );
  test.skip(testInfo.project.name !== "chromium-desktop", "Desktop only");

  const sanityRequests = trackSanityRequests(page);
  const fixture = await openFixture(page);
  const navigation = fixture.getByRole("navigation", {
    name: "Main navigation",
  });
  await expect(navigation).toBeVisible();

  const mega = navigation
    .locator("button[aria-expanded]")
    .filter({ hasText: "Solutions" });
  await expect(mega).toHaveCount(1);
  await expect(mega).toHaveAttribute("aria-expanded", "false");
  await mega.focus();
  await mega.press("Enter");
  await expect(mega).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText("Start with Proti", { exact: true }),
  ).toBeVisible();

  const image = page
    .locator('img[alt="Teal navigation illustration"]:visible')
    .first();
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth), {
      message: "The local megamenu illustration did not load",
    })
    .toBeGreaterThan(0);
  await capture(page, "navigation-desktop-mega-open.png", false);

  await mega.press("Escape");
  await expect(mega).toHaveAttribute("aria-expanded", "false");

  const dropdown = navigation
    .locator("button[aria-expanded]")
    .filter({ hasText: "Products" });
  await expect(dropdown).toHaveCount(1);
  await expect(dropdown).toHaveAttribute("aria-expanded", "false");
  await dropdown.focus();
  await dropdown.press("Enter");
  await expect(dropdown).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("link", { name: /Component Library/i }),
  ).toBeVisible();
  await capture(page, "navigation-desktop-dropdown-open.png", false);

  await dropdown.press("Escape");
  await expect(dropdown).toHaveAttribute("aria-expanded", "false");

  // HeaderUtilities is a real part of SiteHeader, so also snapshot the
  // deterministic locale control without navigating away from the fixture.
  const language = fixture.getByRole("button", {
    name: /current language: en/i,
  });
  await expect(language).toHaveAttribute("aria-expanded", "false");
  await language.click();
  await expect(language).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("menuitem", { name: "ES" })).toHaveAttribute(
    "href",
    "/es-us/visual-fixtures/navigation",
  );
  await capture(page, "navigation-desktop-language-open.png", false);
  await language.press("Escape");
  await expect(language).toHaveAttribute("aria-expanded", "false");

  expect(sanityRequests, "Navigation fixture must not query Sanity").toEqual(
    [],
  );
});

test("Navigation mobile: drawer, submenu, focus and scroll lock", async ({
  page,
}, testInfo) => {
  test.skip(
    !fixtureMode,
    "Set PROTI_VISUAL_FIXTURES=1 for fixture screenshots",
  );
  test.skip(testInfo.project.name !== "chromium-mobile", "Mobile only");

  const sanityRequests = trackSanityRequests(page);
  const fixture = await openFixture(page);
  const open = fixture.getByRole("button", { name: "Open navigation menu" });
  await open.click();

  const dialog = page.getByRole("dialog", { name: "Mobile navigation menu" });
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(
    dialog.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close navigation menu" }),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  await capture(page, "navigation-mobile-drawer-open.png", false);

  const submenu = dialog
    .getByRole("navigation", { name: "Mobile navigation" })
    .locator("button[aria-controls][aria-expanded]")
    .filter({ hasText: "Solutions" });
  await expect(submenu).toHaveCount(1);
  await expect(submenu).toHaveAttribute("aria-expanded", "false");
  await submenu.click();
  await expect(submenu).toHaveAttribute("aria-expanded", "true");
  await capture(page, "navigation-mobile-submenu-open.png", false);

  await submenu.press("Escape");
  await expect(submenu).toHaveAttribute("aria-expanded", "false");
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  expect(sanityRequests, "Navigation fixture must not query Sanity").toEqual(
    [],
  );
});
