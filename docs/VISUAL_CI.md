# Visual regression CI (v0.4.0)

Playwright's Chromium desktop/mobile screenshot comparisons are required quality gates for Proti pull requests. Visual tests run **after** functional smoke tests and do not regenerate screenshots in CI.

## Browser projects

- `chromium-desktop` — 1440 × 900; committed visual baseline.
- `chromium-mobile` — Pixel 7 emulation; committed visual baseline.
- `firefox-desktop` / `firefox-mobile` — smoke/functional coverage only (the mobile project is narrow Firefox desktop, not Android emulation).
- Optional WebKit can be enabled independently when installed; it has no required visual baseline.

## Validated CI flow

```text
Web unit/type/lint/build checks
        ↓
Playwright smoke: build → Next production start → /api/health readiness → CMS page assertions
        ↓
Playwright visual: build → Next production start → screenshot comparison
```

Both browser jobs set:

```yaml
PLAYWRIGHT_BASE_URL: http://localhost:3000
PLAYWRIGHT_WEB_SERVER_COMMAND: pnpm exec next start -p 3000
PLAYWRIGHT_SKIP_WEBSERVER: "0"
E2E_HOME_PATH: /
```

`/api/health` returns a minimal `{ "status": "ok" }` and checks **only** server readiness. The tests navigate the actual published Sanity-backed homepage, which will return 404 unless **Site → Routing** contains the published `localhost` hostname and a published homepage exists. This separation fixed prior Playwright startup/404 confusion.

## First-time baselines in a new project

Running `pnpm proti:init --new-project` in a **clean clone** removes inherited demo PNGs; a rerun in an established project never deletes them. After seeding/publishing the new homepage:

```bash
pnpm --dir web exec playwright install chromium
pnpm proti:visual:init
```

The root command checks for an available port, builds Web, runs desktop/mobile `--update-snapshots` against a production server, verifies the two `home.png` files, and instructs you to review/commit the resulting baseline. Set `PROTI_VISUAL_PORT` to an alternate free port if needed. Existing snapshots require an intentional `pnpm proti:visual:init --force` to replace them.

Do not run visual initialization in routine CI. CI must fail on missing/changed snapshots rather than approve them automatically.

## Inspecting and approving visual differences

From `web/`:

```bash
pnpm test:e2e:visual --project=chromium-desktop --project=chromium-mobile
pnpm test:e2e:report
```

If the test fails, use expected/actual/diff screenshots and traces in `web/test-results/` / `web/playwright-report/`. Decide whether the change is intentional **before** updating:

```bash
pnpm test:e2e:update
pnpm test:e2e:visual
```

Review the changed PNGs and commit them with the intentional code/content change. The configured maximum diff pixel ratio is `0.002`; do not increase it as a shortcut for unreviewed changes.

## Current limitation and future direction

The v0.4.0 baseline still represents real **published Sanity content**. Changing a header, hero title, footer, or other editorial content can trigger a real screenshot diff even when CSS is unchanged. A deterministic fixture-driven visual suite independent of Sanity content, with representative Page/Blog/interactive states, is a proposed **v0.5.0** improvement. No additional regression dataset is required for v0.4.0.

## Branch protection and artifacts

A protected `main` should require `Studio`, `Web`, `Playwright smoke`, and `Playwright visual` checks. Failed Playwright jobs upload the report and test-results artifacts with limited retention. Do not set `continue-on-error: true` on the visual job.

See [Testing](TESTING.md), [CI Branch Protection](CI_BRANCH_PROTECTION.md), and [Project Initialization](PROJECT_INITIALIZATION.md).
