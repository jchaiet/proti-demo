# Proti Playwright E2E tests

Run Web Playwright commands from `web/` or use `pnpm --dir web` at the repo root.
Use `pnpm exec playwright install --with-deps chromium firefox` if browser
binaries or Linux dependencies are missing.

## v0.5.0 suites

- `pnpm test:e2e:smoke`: real Sanity content (requires an existing published
  homepage and Site whose `domains` includes `localhost`).
- `pnpm test:e2e:visual`: fixture-backed desktop/mobile screenshots in the six
  `visual-*.spec.ts` fixture suites; no mutable Sanity content.
- `pnpm test:e2e:update`: intentionally regenerate those fixture PNGs only
  after reviewing a visual change.
- `pnpm test:e2e:visual:cms` and `pnpm test:e2e:update:cms`: optional legacy
  CMS-dependent page-level snapshots; not required in v0.5 CI.
- `pnpm test:e2e`: smoke + functional navigation + fixture suite. In a normal
  build, screenshot cases skip and only their route-protection checks run.

## How to use visual fixtures

```bash
PROTI_VISUAL_FIXTURES=1 pnpm build
PROTI_VISUAL_FIXTURES=1 PLAYWRIGHT_SKIP_WEBSERVER=0 \
pnpm test:e2e:visual --project=chromium-desktop --project=chromium-mobile
```

A normal production build uses `PROTI_VISUAL_FIXTURES=0`. **Do not enable
fixture routes in publicly deployed applications.** The new image assets are
in `public/visual-fixtures/assets/`; screenshots are in
`e2e/__screenshots__/chromium-{desktop,mobile}/`.

For first-time snapshot initialization use `pnpm proti:visual:init` **from the
repository root**. It guards against unintentional overwriting; `--force`
requires explicit intent.

When investigating a mismatch, open the Playwright report with
`pnpm test:e2e:report`. Never update baselines solely to make CI green.

For the complete two-build workflow, fixture inventory, and CI commands see
[Deterministic Visual CI](../../docs/VISUAL_CI.md). Historical details about
Sanity-backed page snapshots remain in [Visual Regression](VISUAL_REGRESSION.md).
