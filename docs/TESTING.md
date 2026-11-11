# Proti testing and regression workflow (v0.5.0)

Proti tests three parts of the monorepo:

| Location  | Commands                                                     | What they verify                                                                   |
| --------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Root      | `pnpm test:proti`, `pnpm proti:check`                        | Initialization, seeding, visual-baseline lifecycle, independent project acceptance |
| `studio/` | `pnpm test`, `pnpm build`                                    | Sanity schema and Studio integration                                               |
| `web/`    | `pnpm test:run`, `pnpm typecheck`, `pnpm lint`, `pnpm build` | Vitest, TypeScript, ESLint, Next production build                                  |
| `web/`    | `pnpm test:e2e:smoke`                                        | Actual CMS-backed pages in Chromium and Firefox                                    |
| `web/`    | `pnpm test:e2e:visual`                                       | Deterministic fixture screenshots in Chromium desktop/mobile                       |
| `web/`    | `pnpm test:e2e:visual:cms`                                   | Optional legacy CMS-backed screenshots                                             |

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
pnpm --dir web test:e2e:visual \
  --project=chromium-desktop --project=chromium-mobile
```

For new projects, once initialization/configuration is complete and fixture
assets exist, run `pnpm proti:visual:init` to create approved snapshots. The
script verifies **37** baseline images (19 desktop, 18 mobile). Use `--force`
only when intentionally regenerating existing baselines.

## Screenshot policy

Compare without `--update-snapshots` by default. On a failure, inspect
expected, actual, diff, trace, and context in `web/test-results/` and
`web/playwright-report/`. When the difference is understood and approved,
rebuild in fixture mode, use `pnpm --dir web test:e2e:update` (Chromium only),
review the changed PNGs, and rerun comparisons without updating. CI never
accepts new baseline images automatically.

`web/e2e/.env.e2e` is for CMS-backed integration routes; `.env.local` secrets
must not be committed. Playwright's exact projects and screenshot layout are
configured in `web/playwright.config.ts`.

See [Visual CI](VISUAL_CI.md), [Project Initialization](PROJECT_INITIALIZATION.md),
[SEO/GEO](SEO_GEO.md), and [Release Checklist](RELEASE_CHECKLIST.md).
