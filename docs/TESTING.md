# Proti testing and regression workflow (v0.6.0)

## DX onboarding regression (v0.6.0)

Run `pnpm test:proti:dx` from the repository root to verify **new-project initialization → generated Web/Studio environment → offline preflight**, the explicit Git reset guard, production fixture protection, and developer command/documentation contracts in isolated temporary projects. This suite is automatically included in `pnpm test:proti` and therefore `pnpm verify:quick`; it does **not** need Sanity credentials or start browser processes.

For the separate real-world installation, build, and CMS connectivity checks required before release, follow [DX Regression](DX_REGRESSION.md).

Proti tests three parts of the monorepo:

| Location  | Commands                                                     | What they verify                                                                   |
| --------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Root      | `pnpm test:proti`, `pnpm proti:check`                        | Initialization, seeding, visual-baseline lifecycle, independent project acceptance |
| `studio/` | `pnpm test`, `pnpm build`                                    | Sanity schema and Studio integration                                               |
| `web/`    | `pnpm test:run`, `pnpm typecheck`, `pnpm lint`, `pnpm build` | Vitest, TypeScript, ESLint, Next production build                                  |
| `web/`    | `pnpm test:e2e:smoke`                                        | Actual CMS-backed pages in Chromium and Firefox                                    |
| `web/`    | `pnpm test:e2e:visual`                                       | Legacy `e2e/visual.spec.ts` screenshots (CMS-backed routes)                        |
| Root      | `pnpm verify:fixtures`                                       | Fixture visuals, accessibility, and Grid layout in Chromium desktop/mobile         |

## Developer shortcuts

Run `pnpm proti:commands` to list workflows. `pnpm verify:quick` validates the
local configuration and runs code/unit checks without building fixture pages.
`pnpm verify:fixtures` builds the production Web app with fixture routes and
compares visual screenshots while running accessibility and Grid layout checks.
`pnpm verify:performance` builds fixtures and runs Lighthouse budgets;
`pnpm verify:all` performs all three groups with only one fixture build.
See [Developer Commands](DEVELOPER_COMMANDS.md) for prerequisites, dry runs,
and the **never deploy a fixture-enabled build** warning. Existing CI jobs are
unchanged.

## Smoke tests versus visual tests

**Smoke** checks published pages via the real Site resolver and needs configured
Sanity content. It uses `http://localhost:3000`, since hostname matching means
`127.0.0.1` may not resolve the same Site. Build with
`PROTI_VISUAL_FIXTURES=0`. Smoke also tests that fixture routes are not public.

**Visual** checks version-controlled component fixture routes. It uses real
Proti/Mino UI rendering but no live CMS content; build with
`PROTI_VISUAL_FIXTURES=1`. It is expected to skip its route-gating checks in
this mode. It runs only Chromium desktop and mobile screenshot comparisons.

**Never compare both modes against the same build:** run a separate `pnpm build`
when switching the flag.

## Local commands

From the repository root:

```bash
pnpm test:proti
pnpm proti:env:check  # offline environment preflight; no Sanity requests
pnpm --dir studio test
pnpm --dir studio build
pnpm --dir web test:run
pnpm --dir web typecheck
pnpm --dir web lint

# CMS-backed smoke / route gating
PROTI_VISUAL_FIXTURES=0 pnpm --dir web build
PROTI_VISUAL_FIXTURES=0 PLAYWRIGHT_SKIP_WEBSERVER=0 \
pnpm --dir web test:e2e:smoke

# Fixture visual regression (rebuild first)
PROTI_VISUAL_FIXTURES=1 pnpm --dir web build
PROTI_VISUAL_FIXTURES=1 PLAYWRIGHT_SKIP_WEBSERVER=0 \
pnpm --dir web exec playwright test e2e/visual-fixtures.spec.ts \
  --project=chromium-desktop --project=chromium-mobile
```

For newly initialized sites, once environment setup is complete, run `pnpm proti:visual:init` to create project-owned **fixture** snapshots. The initializer checks the expected inventory in `scripts/proti-visual-fixtures.mjs`. Use `--force` only when deliberately reviewing and replacing existing baselines; never run it to silence unexplained differences.

## Screenshot policy

Compare without `--update-snapshots` by default. On a failure, inspect
expected, actual, diff, trace, and context in `web/test-results/` and
`web/playwright-report/`. When the difference is understood and approved,
rebuild in fixture mode, update **only the affected fixture spec** with
`pnpm --dir web exec playwright test <fixture-spec> --update-snapshots`
(and the relevant Chromium projects), inspect the changed PNGs, then rerun
comparisons without updating. CI never accepts new baseline images automatically.

`web/e2e/.env.e2e` is for CMS-backed integration routes; `.env.local` secrets must not be committed. Playwright's exact projects, screenshots, and readiness endpoint are configured in `web/playwright.config.ts`.

## Verify a UI or block change

1. Run `pnpm verify:quick` at the root (offline env check + root/Web/Studio tests, lint/typecheck and runner tests).
2. Run `pnpm verify:fixtures` (one guarded production Web build, Chromium desktop/mobile fixture screenshots, automated accessibility and delayed Grid image-layout checks).
3. Run `pnpm verify:performance` when the change affects layout, images, CSS, fonts, JavaScript or critical rendering; it builds fixtures and runs Lighthouse on Hero, Grid and Navigation. `pnpm verify:all` combines the workflows with a single fixture build.
4. Review failed screenshots **before** updating baselines. After confirming a visual change is intended, rebuild fixtures, run the **specific fixture spec** with `--update-snapshots`, inspect PNGs, and rerun without updating. The legacy `pnpm --dir web test:e2e:update` script targets `e2e/visual.spec.ts`, not the entire deterministic fixture suite.
5. For changes to Sanity data, routing, publication or revalidation, run the separate CMS-backed smoke suite against a **normal non-fixture** build (and ensure the appropriate published Site domain is configured).

## Lighthouse performance checks

The deterministic Lighthouse runner records desktop/mobile medians from three runs per route. Current enforced goals: Lighthouse score **≥ 90**, LCP **≤ 2.5 s**, CLS **≤ 0.1**; TBT **≤ 200 ms** is a warning-only optimization target. These are **lab** measurements, not real-user INP. Reports are saved under `web/test-results/performance/`, including `summary.md` and `summary.json`; GitHub Actions should retain raw reports when a budget fails. See [Developer Commands](DEVELOPER_COMMANDS.md).

See [Visual CI](VISUAL_CI.md), [Project Initialization](PROJECT_INITIALIZATION.md),
[SEO/GEO](SEO_GEO.md), and [Release Checklist](RELEASE_CHECKLIST.md).
