// The approved fixture screenshots are Proti's visual regression contract.
// Keep this manifest aligned with the screenshot names in web/e2e/visual-*.spec.ts.
// All paths below are relative to the web/ package (Playwright's working dir).
export const VISUAL_FIXTURE_SPECS = Object.freeze([
  "e2e/visual-fixtures.spec.ts",
  "e2e/visual-content.spec.ts",
  "e2e/visual-grid-cards.spec.ts",
  "e2e/visual-accordion.spec.ts",
  "e2e/visual-tabs-carousel.spec.ts",
  "e2e/visual-navigation.spec.ts",
]);

const common = Object.freeze([
  "hero.png",
  "content.png",
  "rich-text.png",
  "grid.png",
  "cards.png",
  "accordion-collapsed.png",
  "accordion-one-expanded.png",
  "accordion-multiple-expanded.png",
  "accordion-single-open.png",
  "tabs-overview.png",
  "tabs-details.png",
  "tabs-accessibility.png",
  "carousel-initial.png",
  "carousel-next.png",
  "carousel-return.png",
  "navigation-default.png",
]);

export const VISUAL_FIXTURE_BASELINES = Object.freeze({
  "chromium-desktop": Object.freeze([
    ...common,
    "navigation-desktop-mega-open.png",
    "navigation-desktop-dropdown-open.png",
    "navigation-desktop-language-open.png",
  ]),
  "chromium-mobile": Object.freeze([
    ...common,
    "navigation-mobile-drawer-open.png",
    "navigation-mobile-submenu-open.png",
  ]),
});

export function visualBaselinePaths() {
  return Object.entries(VISUAL_FIXTURE_BASELINES).flatMap(([project, files]) =>
    files.map((file) => `web/e2e/__screenshots__/${project}/${file}`),
  );
}
