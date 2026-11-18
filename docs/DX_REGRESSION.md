# Developer Experience Regression — Proti v0.6.0

This is the final Developer Experience (DX) verification before the v0.6.0 release regression. The automated tests exercise **temporary, disposable projects**; they never initialize the working starter repository, contact Sanity, publish content, deploy, or update visual snapshots.

## Automated onboarding acceptance tests

From the monorepo root:

```bash
pnpm test:proti:dx
```

This command runs `scripts/proti-dx-regression.test.mjs` and checks:

1. **New site initialization:** The real `proti:init` writes matching project, Web, and Studio configuration. The generated `.env` files pass the real offline `proti:env:check` command.
2. **Git-history protection:** A disposable starter-like Git clone refuses unconfirmed initialization and permits `--new-project` only with the exact `RESET GIT HISTORY` acknowledgement. The new repository has no inherited remote. The maintained source marker blocks initialization before any files are changed.
3. **Invalid configuration:** Changes that make Studio and Web inconsistent produce nonzero exit codes and actionable variable names, without echoing configuration values.
4. **Local versus CI mode:** CI mode does not silently load local Web `.env` files and succeeds with explicit exported settings.
5. **Production safety:** `PROTI_VISUAL_FIXTURES=1` is rejected by the production Web preflight.
6. **Safe developer workflows:** The `verify:all --dry-run` command makes no changes, does not require installed pnpm, and does not update screenshots.
7. **Script and documentation contracts:** All commands and Playwright specs referenced by the `verify:all` plan exist; local links in primary developer guides resolve.

The suite uses Node's built-in test runner and Git, with no third-party package installation. Temporary files are created under the operating system's temp directory and automatically removed.

`pnpm test:proti` now includes this suite. Consequently, `pnpm verify:quick` and `pnpm verify:all` run it as part of their normal checks.

## Manual clean-setup acceptance check

Automated tests **do not** establish that a real `pnpm install --frozen-lockfile`, remote Sanity connection, production build, or deployed preview works. These must be checked in a clean, independent checkout before release:

1. Follow [Getting Started](GETTING_STARTED.md) from a fresh clone. Check Node/pnpm versions, available Mino UI package archive, and a matching lockfile. Do **not** run `proti:init --new-project` in the maintained starter repository.
2. Run `pnpm install --frozen-lockfile` and confirm Web and Studio dependencies install successfully.
3. Configure your test Sanity project/dataset and tokens. Use `pnpm proti:env:check` for offline validation, then `pnpm proti:check` for live connectivity.
4. Run `pnpm build:web:checked`, `pnpm build:studio:checked`, and `pnpm verify:quick`.
5. In a properly configured test site, start both apps and verify the homepage and Studio editing/Presentation experience. Verify localhost is in the **published** Site Routing domains.
6. Run `pnpm verify:fixtures` and `pnpm verify:performance` when Chromium/Lighthouse are available. A fixture-enabled build is **never** a production artifact. Run a normal build before a deployment.
7. Review GitHub Actions results after pushing a test branch. Review visual diffs rather than updating baselines blindly.

Before the final release, record any environment-specific limitations or skipped checks in the release notes. Do not record tokens, env files, or other credentials in the report.

## What a failure means

- **Init fails before writing files:** The local checkout may be protected, unclean, or missing the required typed acknowledgement. Check [Project Initialization](PROJECT_INITIALIZATION.md).
- **Offline preflight fails locally:** Use the default development mode, which loads local dotenv files. `--mode=ci` requires exported Web variables. Check [Environment Preflight](ENVIRONMENT_PREFLIGHT.md).
- **Verification command references a missing script/spec:** The developer command plan has drifted from Web/Studio packages or the test layout. Fix the plan or restore the missing command; do not skip the test.
- **Fixture or Lighthouse failures:** Diagnose the browser and budget reports using [Testing](TESTING.md). Only intentional, visually reviewed screenshot changes should update committed baselines.

After DX regression passes, proceed to the **v0.6.0 final regression and release checklist** in [Release Checklist](RELEASE_CHECKLIST.md).
