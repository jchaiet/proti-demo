import { expect, test, type Locator, type Page } from "@playwright/test";

const path = "/visual-fixtures/accordion";
const fixtureMode = process.env.PROTI_VISUAL_FIXTURES === "1";
const screenshotProjects = ["chromium-desktop", "chromium-mobile"];

const titles = {
  multiFirst: "How are visual fixtures rendered?",
  multiSecond: "Why use predictable content?",
  multiThird: "What happens on smaller screens?",
  singleFirst: "Which panel opens first?",
  singleSecond: "Can a second panel replace it?",
} as const;

// Match accessible disclosure controls whether Mino UI uses an ARIA button
// or the native <details>/<summary> pattern. Avoid implementation CSS classes.
function trigger(page: Page, title: string): Locator {
  return page
    .locator(
      'main[data-visual-fixture="accordion"] :is(button, summary, [role="button"])',
    )
    .filter({ hasText: title });
}

// A native <summary> exposes expanded state through its parent <details open>.
// Custom disclosure buttons must expose aria-expanded. Do not treat mere
// content visibility as a substitute for an accessible expanded state.
async function expectExpanded(control: Locator, expanded: boolean) {
  const details = control.locator("xpath=ancestor::details[1]");

  if (await details.count()) {
    await expect(details).toHaveJSProperty("open", expanded);
  } else {
    await expect(control).toHaveAttribute("aria-expanded", String(expanded));
  }
}

// Make a missing trigger actionable: distinguish a missing title from an
// inaccessible/non-interactive title, and show the surrounding rendered HTML.
async function expectTrigger(page: Page, title: string): Promise<Locator> {
  const fixture = page.locator('main[data-visual-fixture="accordion"]');
  const heading = fixture.getByText(title, { exact: true });
  await expect(heading).toHaveCount(1);

  const control = trigger(page, title);
  if ((await control.count()) !== 1) {
    const html = await heading.evaluate(
      (element) =>
        element.parentElement?.outerHTML.slice(0, 3000) ?? element.outerHTML,
    );
    throw new Error(
      `Accordion item "${title}" has no unique accessible disclosure control.\n${html}`,
    );
  }
  return control;
}

async function ready(page: Page) {
  const response = await page.goto(path, { waitUntil: "load" });
  expect(response?.status()).toBe(200);

  const fixture = page.locator('main[data-visual-fixture="accordion"]');
  await expect(fixture).toBeVisible();
  await expect(fixture.getByText("Frequently asked questions")).toBeVisible();
  await expect(fixture.getByText("One panel at a time")).toBeVisible();
  await expect(page.locator("nextjs-portal")).toHaveCount(0);

  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  return fixture;
}

function trackSanityRequests(page: Page) {
  const sanityRequests: string[] = [];
  page.on("request", (request) => {
    try {
      const host = new URL(request.url()).hostname;
      if (host === "sanity.io" || host.endsWith(".sanity.io")) {
        sanityRequests.push(request.url());
      }
    } catch {
      // Ignore non-network URLs.
    }
  });
  return sanityRequests;
}

async function screenshot(page: Page, name: string) {
  // Keep the viewport position consistent after clicks/keyboard interactions.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
}

test("accordion route is disabled without explicit opt-in", async ({
  page,
}) => {
  test.skip(fixtureMode, "Run the route-gating check with fixtures disabled");
  const response = await page.goto(path);
  expect(response?.status()).toBe(404);
});

test("accordion collapsed, one-expanded, and multiple-expanded visuals", async ({
  page,
}, testInfo) => {
  test.skip(
    !fixtureMode,
    "Set PROTI_VISUAL_FIXTURES=1 for fixture screenshots",
  );
  test.skip(
    !screenshotProjects.includes(testInfo.project.name),
    "Fixture screenshots use Chromium desktop/mobile only",
  );

  const sanityRequests = trackSanityRequests(page);
  const fixture = await ready(page);
  const first = await expectTrigger(page, titles.multiFirst);
  const second = await expectTrigger(page, titles.multiSecond);
  const third = await expectTrigger(page, titles.multiThird);

  await expectExpanded(first, false);
  await expectExpanded(second, false);
  await expectExpanded(third, false);

  await screenshot(page, "accordion-collapsed.png");

  await first.click();
  await expectExpanded(first, true);
  await expect(
    fixture.getByText(
      "Proti sends stable content through the real BlockRenderer",
      {
        exact: false,
      },
    ),
  ).toBeVisible();
  await screenshot(page, "accordion-one-expanded.png");

  await second.click();
  await expectExpanded(first, true);
  await expectExpanded(second, true);
  await expect(
    fixture.getByText(
      "Predictable content makes layout differences meaningful.",
      {
        exact: false,
      },
    ),
  ).toBeVisible();
  await screenshot(page, "accordion-multiple-expanded.png");

  // It must still be possible to collapse an individual panel.
  await first.click();
  await expectExpanded(first, false);
  await expectExpanded(second, true);
  expect(sanityRequests, "Fixture must not request live Sanity data").toEqual(
    [],
  );
});

test("accordion keyboard controls and single-open mode", async ({
  page,
}, testInfo) => {
  test.skip(
    !fixtureMode,
    "Set PROTI_VISUAL_FIXTURES=1 for fixture interactions",
  );
  test.skip(
    !screenshotProjects.includes(testInfo.project.name),
    "Fixture interaction checks use Chromium desktop/mobile only",
  );

  const sanityRequests = trackSanityRequests(page);
  await ready(page);
  const first = await expectTrigger(page, titles.singleFirst);
  const second = await expectTrigger(page, titles.singleSecond);
  await expectExpanded(first, false);
  await expectExpanded(second, false);

  // Enter opens the focused native button; Space closes it.
  await first.focus();
  await first.press("Enter");
  await expectExpanded(first, true);
  await expectExpanded(second, false);

  await first.press("Space");
  await expectExpanded(first, false);

  // Single-open behavior: opening the next item automatically closes the first.
  await first.click();
  await expectExpanded(first, true);
  await second.click();
  await expectExpanded(first, false);
  await expectExpanded(second, true);
  await screenshot(page, "accordion-single-open.png");

  expect(sanityRequests, "Fixture must not request live Sanity data").toEqual(
    [],
  );
});
