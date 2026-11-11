# Deterministic visual regression (v0.5.0)

Proti uses **repository-controlled CMS-shaped fixtures** with the real production
`BlockRenderer`, mappers, and Mino UI components. Unlike the former page-level
screenshots, fixture screenshots are **not coupled to published Sanity content**.

## What CI tests

The required jobs in `.github/workflows/ci.yml` remain **Studio**, **Web**,
**Playwright smoke**, and **Playwright visual**.

- **Smoke:** builds with `PROTI_VISUAL_FIXTURES=0` and uses actual published
  Site content. Because Sites resolve by host, smoke uses `localhost`, which
  must be in the Site's configured domains. The smoke job also verifies that
  every `/visual-fixtures/*` route returns HTTP 404.
- **Visual:** performs a **separate production build** with
  `PROTI_VISUAL_FIXTURES=1` and compares the approved fixture screenshots on
  `chromium-desktop` and `chromium-mobile`. It runs the six specs below only;
  it does not run the legacy Sanity-backed `e2e/visual.spec.ts`.
- Neither CI job uses `--update-snapshots`. Review diffs and commit approved
  snapshots in the PR before merging.

## Fixture suites

| Fixture routes                                           | Spec                               |
| -------------------------------------------------------- | ---------------------------------- |
| `/visual-fixtures/hero`                                  | `e2e/visual-fixtures.spec.ts`      |
| `/visual-fixtures/content`, `/visual-fixtures/rich-text` | `e2e/visual-content.spec.ts`       |
| `/visual-fixtures/grid`, `/visual-fixtures/cards`        | `e2e/visual-grid-cards.spec.ts`    |
| `/visual-fixtures/accordion`                             | `e2e/visual-accordion.spec.ts`     |
| `/visual-fixtures/tabs`, `/visual-fixtures/carousel`     | `e2e/visual-tabs-carousel.spec.ts` |
| `/visual-fixtures/navigation`                            | `e2e/visual-navigation.spec.ts`    |

Fixtures use checked-in SVGs from `web/public/visual-fixtures/assets/` and
stable source objects in `web/src/visual-fixtures/`. The route flag is intended
**only for test builds**; never set `PROTI_VISUAL_FIXTURES=1` in normal Vercel
production or public staging deployments.

## Running fixture snapshots locally

From the repository root, first make sure port 3000 is free. Fixture mode must
be enabled at **build time**, not only when starting Playwright:

```bash
PROTI_VISUAL_FIXTURES=1 pnpm --dir web build
PROTI_VISUAL_FIXTURES=1 PLAYWRIGHT_SKIP_WEBSERVER=0 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 \
PLAYWRIGHT_WEB_SERVER_COMMAND='pnpm exec next start -p 3000 -H 127.0.0.1' \
pnpm --dir web test:e2e:visual \
  --project=chromium-desktop --project=chromium-mobile
```

For a **freshly initialized Proti project**, generate the entire baseline set
once after setup:

```bash
pnpm proti:visual:init
```

The command builds with fixtures enabled and updates all fixture screenshots.
It refuses to overwrite existing PNGs unless you explicitly pass `--force`.
Do **not** use `--force` to silence unexplained CI differences. Approved images
live under `web/e2e/__screenshots__/chromium-{desktop,mobile}/`. Review and
commit changes. `pnpm proti:check` warns if any required fixture PNG is missing.

## Intentionally updating a baseline

1. Investigate the Playwright **expected / actual / diff** artifacts first.
2. Make the intended component change and confirm that it warrants a new image.
3. Use the **same OS, fonts, browser and Playwright version** as CI whenever
   possible. A local Ubuntu snapshot may still differ from GitHub-hosted Ubuntu.
4. Rebuild with `PROTI_VISUAL_FIXTURES=1` and run `pnpm --dir web test:e2e:update`
   with the two Chromium `--project` options.
5. Review `git diff -- web/e2e/__screenshots__/` and the PNGs themselves.
6. Rerun `pnpm --dir web test:e2e:visual` **without** updating. Commit approved
   images in the same PR as the change.

For a brand-new component, add a CMS-shaped fixture, gated route, Vitest mapper
coverage, and Playwright assertions. Then register the screenshot filenames in
`scripts/proti-visual-fixtures.mjs` and update the Web scripts/CI fixture list.

## Running the production route gate

A separate build is required when switching modes:

```bash
PROTI_VISUAL_FIXTURES=0 pnpm --dir web build
PROTI_VISUAL_FIXTURES=0 PLAYWRIGHT_SKIP_WEBSERVER=0 \
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
PLAYWRIGHT_WEB_SERVER_COMMAND='pnpm exec next start -p 3000' \
pnpm --dir web exec playwright test \
  e2e/visual-fixtures.spec.ts e2e/visual-content.spec.ts \
  e2e/visual-grid-cards.spec.ts e2e/visual-accordion.spec.ts \
  e2e/visual-tabs-carousel.spec.ts e2e/visual-navigation.spec.ts \
  --grep 'disabled without|returns? 404' --project=chromium-desktop
```

Do not test a normal-build gate against a stale fixture-enabled `.next` build.

## Legacy page-level CMS screenshots

`pnpm --dir web test:e2e:visual:cms` remains available as an **optional** manual
integration diagnostic. These screenshots depend on published CMS pages and are
**not required** by the v0.5.0 CI Visual job. Use
`test:e2e:update:cms` only when intentionally reviewing that legacy baseline.
See `web/e2e/VISUAL_REGRESSION.md` for historical context.

## Troubleshooting

- **Smoke `/` is 404:** ensure the request hostname is `localhost` and the
  published Site includes it in `domains`; this is not a visual-fixture issue.
- **Fixture route is 404:** rebuild with `PROTI_VISUAL_FIXTURES=1`.
- **SVGs are missing:** check `web/public/visual-fixtures/assets/`.
- **Screenshots differ only in CI:** compare OS/fonts/Playwright/browser version
  and examine uploaded `web/test-results/` / `web/playwright-report/` artifacts.
- **Initializer refuses to overwrite:** commit or inspect existing PNGs; use
  `--force` only for deliberately approved regeneration.
