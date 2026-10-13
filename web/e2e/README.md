# Proti Playwright E2E tests

For the v0.3 production-release workflow, see [Testing](../../docs/TESTING.md). Screenshot updates are an intentional approval action, not a mandatory step before every run.

This setup belongs in the **web app root**, next to that app's `package.json`.
It does not belong in the Sanity Studio package.

## 1. Install Playwright browsers

Playwright is already a Web development dependency in Proti v0.3. Install browser binaries if necessary:

```bash
pnpm exec playwright install chromium firefox
```

Do not re-add the dependency just to run existing tests.

On Linux CI, if the runner does not already have the required system dependencies:

```bash
pnpm exec playwright install --with-deps chromium firefox
```

## 2. Add the package.json scripts

Merge these into the web app's existing `scripts` object:

```json
{
  "test:e2e": "playwright test",
  "test:e2e:smoke": "playwright test e2e/smoke.spec.ts",
  "test:e2e:visual": "playwright test e2e/visual.spec.ts",
  "test:e2e:update": "playwright test e2e/visual.spec.ts --update-snapshots",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:report": "playwright show-report"
}
```

## 3. Create your local E2E environment file

Copy:

```text
e2e/.env.e2e.example
```

to:

```text
e2e/.env.e2e
```

Then uncomment/configure only routes that really exist in the Sanity content
for the site you are testing.

The homepage (`/`) is always tested. All other route types are optional.

## 4. Run smoke tests first

```bash
pnpm test:e2e:smoke
```

The smoke suite runs in three projects:

- `chromium-desktop`: Desktop Chrome profile at 1440 × 900
- `chromium-mobile`: Playwright's Pixel 7 device profile
- `firefox-desktop`: Desktop Firefox profile at 1440 × 900

The Chromium mobile project uses Playwright's full device descriptor rather
than only shrinking the viewport. That also emulates relevant mobile browser
properties such as touch, screen size and user agent.

## 5. Establish or intentionally refresh the visual baseline

**Only** when no approved baseline exists or a visual change has been reviewed and accepted (and smoke tests are green):

```bash
pnpm test:e2e:update
```

Visual regression runs only in the Chromium projects. Expected screenshots are
written to:

```text
e2e/__screenshots__/
  chromium-desktop/
  chromium-mobile/
```

Review those images and commit them.

Firefox is intentionally excluded from `visual.spec.ts`. It still runs the
functional smoke tests, giving Proti cross-browser coverage without requiring a
second browser-specific screenshot baseline.

For an existing approved baseline, **skip the update command**. Refreshing snapshots automatically can hide an actual regression. See [Testing](../../docs/TESTING.md).

## 6. Normal visual regression run

```bash
pnpm test:e2e:visual
```

Playwright will compare the Chromium desktop and mobile renders against the
committed baseline.

## Useful commands

Run everything:

```bash
pnpm test:e2e
```

Open Playwright's interactive UI:

```bash
pnpm test:e2e:ui
```

Open the latest HTML report:

```bash
pnpm test:e2e:report
```

Run a single project when debugging:

```bash
pnpm exec playwright test --project=chromium-desktop
pnpm exec playwright test --project=chromium-mobile
pnpm exec playwright test --project=firefox-desktop
```

## Notes about screenshot baselines

Browser screenshots can differ across operating systems, fonts, hardware and
headless/headed environments. Generate and compare baselines in the same
environment whenever possible. If CI becomes the source of truth later, keep
its OS and Playwright/browser version pinned.
