# Developer commands (Proti v0.6.0)

Run these shortcuts from the **monorepo root**. They orchestrate existing `pnpm`
commands; they do not replace the Web/Studio scripts or existing GitHub Actions.

| Command                   | Runs                                                                                                                               | When to use                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `pnpm proti:commands`     | Prints command reference                                                                                                           | Discover available workflows                |
| `pnpm verify:quick`       | Offline environment preflight, root tooling tests, Web lint/typecheck/unit tests, Studio unit tests, performance-runner unit tests | Before a normal pull request                |
| `pnpm verify:fixtures`    | Fixture-enabled production Web build, Chromium desktop/mobile visual, accessibility and Grid image-layout tests                    | After UI, accessibility, or fixture changes |
| `pnpm verify:performance` | Fixture-enabled production Web build, desktop/mobile Lighthouse budgets                                                            | After performance-related changes           |
| `pnpm verify:all`         | All quick checks, **one** fixture-enabled build, then browser checks and Lighthouse                                                | Before release or a large merge             |

The root `pnpm test:proti:dx` command checks new-project onboarding and the safety of these workflows using disposable projects (also included in `pnpm verify:quick`). See [DX Regression](DX_REGRESSION.md).

Preview any workflow without running programs:

```bash
pnpm verify:all --dry-run
```

## Prerequisites

- Install dependencies with `pnpm install --frozen-lockfile`, using the
  repository's Node and pnpm versions.
- Configure Web and Studio environment files. `pnpm proti:env:check` reads
  local files in development mode; `--mode=ci` intentionally requires exported
  environment variables instead.
- For fixture browser tests, install Chromium once:
  `pnpm --dir web exec playwright install chromium`.
- Lighthouse requires the Chrome/Chromium executable. Set `CHROME_PATH` if it
  cannot find the browser automatically.

## How fixture mode works

The browser and Lighthouse presets pass `PROTI_VISUAL_FIXTURES=1` **only to
child processes**, including the production Next.js build. They do not
permanently change your terminal's environment, `.env` files, or deployment
configuration. Fixture routes are deliberately unavailable in ordinary
production builds: **never deploy a build produced by `verify:fixtures`,
`verify:performance`, or `verify:all`**. Rebuild normally before deployment.

The fixture test command explicitly selects maintained visual fixture specs,
WCAG A/AA checks, and the delayed Grid image-layout regression test for
Chromium desktop and mobile. It does not run the older CMS-backed
`e2e/visual.spec.ts` snapshot suite. The visual checks only **compare** images;
no shortcut invokes `--update-snapshots`. To approve a visual change, first
review the diff and then update only the affected baselines intentionally.

## Failure handling and reports

The runner stops at the first failed step and preserves its nonzero exit code.
Previous steps' output remains visible. Inspect:

- Visual/a11y failures: `web/test-results/` and `web/playwright-report/`.
- Performance failures: `web/test-results/performance/summary.md` and the
  desktop/mobile Lighthouse reports.

Use the original narrower scripts to investigate a specific failure, such as
`pnpm --dir web test:run`, `pnpm --dir studio test`,
`pnpm --dir web test:performance:unit`, or
`pnpm --dir web exec playwright test e2e/grid-image-layout.spec.ts
--project=chromium-desktop --project=chromium-mobile` (after a fixture build).

## CI and production safety

These commands are **developer conveniences**, not replacements for CI.
The GitHub workflows, Vercel Root Directory (`web`), and existing
`dev:*` / `build:*` / `test:*` scripts remain unchanged. No workflow
publishes to Sanity, deploys Web/Studio, seeds a site, updates baselines, or
changes the package lockfile. Running `verify:all` can be resource-intensive
(Playwright and 18 Lighthouse runs); use the smaller presets day-to-day.
