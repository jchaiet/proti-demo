# Visual Regression CI Calibration

The normal CI pipeline already validates Studio, Web, and Playwright smoke tests.

Visual regression is added as a separate calibration job so Linux/GitHub-hosted rendering can be compared with the committed Chromium baselines before visual checks become merge-blocking.

## First Calibration Run

1. Commit and push the updated `.github/workflows/ci.yml`.
2. Let the standard Studio, Web, and Playwright smoke jobs complete.
3. Open **Playwright visual calibration**.
4. If it passes, repeat the run on at least one more commit with no intentional visual changes.
5. If it reports differences, download the `playwright-visual-artifacts-*` artifact.
6. Inspect:
   - expected screenshots from the committed baseline
   - actual GitHub-runner screenshots
   - diff images
   - the Playwright HTML report

Do **not** run `test:e2e:update` just to make GitHub CI green. First determine whether the difference is a real UI change or an environment-specific rendering difference.

## When to Make Visual CI Blocking

After repeated GitHub-hosted runs are stable:

1. Remove this from the `playwright-visual` job:

```yaml
continue-on-error: true
```

2. Rename the job from:

```text
Playwright visual calibration
```

to:

```text
Playwright visual
```

At that point, visual regression failures should block the workflow.

## Baseline Ownership

The canonical baseline remains:

```bash
cd web
pnpm build
pnpm start
pnpm test:e2e:visual
```

For an intentional visual change:

```bash
pnpm test:e2e:visual
# inspect the failure/diff first

pnpm test:e2e:update
# review the new screenshots

pnpm test:e2e:visual
```

Commit the code change and the approved baseline screenshots together.

## Browser Scope

Visual regression intentionally runs only:

- `chromium-desktop`
- `chromium-mobile`

Firefox remains part of smoke/cross-browser behavior coverage, but is not a visual-baseline browser.
