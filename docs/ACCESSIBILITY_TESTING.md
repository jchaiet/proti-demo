# Proti v0.6.0 — Automated accessibility testing (Stage 3A)

## Scope

This first batch adds a separate Playwright accessibility suite for nine version-controlled fixture routes: Hero, Content, Rich Text, Grid, Cards, Accordion, Tabs, Carousel, and Navigation. Each runs on Chromium desktop and mobile (18 checks total). The suite exercises real Proti/Mino UI output without mutable Sanity content.

Automated checks cover rules tagged for WCAG 2.0, 2.1 and 2.2 A/AA in axe-core. They do **not** prove WCAG conformance. Keyboard-only operation, focus order, screen-reader experience, responsive zoom/reflow, and content semantics still need manual review. Interactive open/expanded states will be added in Stage 3B.

## Installation

From the repository root:

```bash
pnpm --filter ./web add -D @axe-core/playwright@4.14.0
```

Place `a11y-fixtures.spec.ts` under `web/e2e/`. This adds one development-only dependency. Do not modify the current visual or smoke test scripts yet.

## First run

```bash
PROTI_VISUAL_FIXTURES=1 pnpm --dir web build

PROTI_VISUAL_FIXTURES=1 \
PLAYWRIGHT_SKIP_WEBSERVER=0 \
pnpm --dir web exec playwright test e2e/a11y-fixtures.spec.ts \
  --project=chromium-desktop \
  --project=chromium-mobile
```

The suite intentionally fails on automatically detected accessibility violations. This initial run is an **audit**, not a promise that all components will immediately pass. Read the failure's `accessibility-violations.json` attachment in Playwright's test results. It contains rule IDs, impacts, and selector targets, not content snippets or visitor details.

Do **not** disable rules globally or add the suite as a required GitHub Actions check merely to make the run green. Investigate and fix the underlying Mino UI/Proti issue; document narrowly scoped exceptions only if a finding is demonstrated to be a false positive.

## Existing tests

The current screenshot tests remain unchanged and continue using approved baselines. Live-CMS smoke tests continue to verify actual published pages and site resolution. This accessibility suite remains opt-in until the initial audit is resolved.

## After the baseline passes

Add checks for visible interactive states (expanded Accordions, active Tabs, open Megamenu, mobile drawer, and Carousel navigation), validate keyboard behavior and focus management, then integrate the new suite into the Visual CI job as a separate step or dedicated accessibility job. Keep `PROTI_VISUAL_FIXTURES=1` confined to the test build, never the normal production deployment.
