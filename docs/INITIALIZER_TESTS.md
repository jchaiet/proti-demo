# Proti initializer and acceptance tests (v0.4.0)

Proti's initialization tooling is tested with Node's built-in test runner; no real Sanity or Vercel project is used by the automated script tests.

## Commands

From the repository root:

```bash
pnpm test:proti              # Complete scripts suite
pnpm test:proti:integration  # Full disposable-project acceptance test
```

The root `package.json` includes `scripts/proti-init.test.mjs`, `proti-seed.test.mjs`, `proti-check.test.mjs`, `proti-visual-init.test.mjs`, `proti-configure-production.test.mjs`, and `proti-acceptance.test.mjs` in `test:proti`.

## Coverage

- New clone normalized project and package names; local/non-secret Studio mode files.
- `localhost` added to a new Site's domains; canonical hostname must be among domains.
- Locale syntax and default locale validated (e.g., `en-us`, `es-us`).
- Maintained source (`git config --local proti.sourceRepository true`) refuses any initialization.
- Clean starter clone refuses ordinary init and requires `--new-project` + **`RESET GIT HISTORY`** acknowledgement for independent Git history.
- Dirty trees, unexpected remotes, worktrees/symlinks, and initialized projects refuse destructive Git operations.
- Independent projects preserve history, remotes, secrets, configuration, and visual PNGs on ordinary reinit.
- First independent Git initialization clears inherited demo screenshot PNGs; visual baseline init generates both required desktop/mobile snapshots and protects existing snapshots unless `--force`.
- Seeding is idempotent and respects an existing authored Site/homepage/navigation; write permissions and connectivity errors are diagnosed.
- Studio development/production Presentation URLs are separate; production URL configuration edits only the relevant values.
- Setup checker identifies environment/Studio URL drift, missing published Site, invalid domain routing, ignored mode env files, and inherited CI preview overrides.

## Disposable acceptance test

`proti-acceptance.test.mjs` assembles an **isolated temporary project** and exercises init → mock Sanity seed → config/check → mock visual init → production URL update → repeat init. It validates the combined behavior without requiring a live CMS, full production build, real GitHub repository, or Vercel deployment.

This is deliberately different from the real independent `proti-temp` deployment rehearsal, which verified Studio, Vercel, Preview, publishing/revalidation, and GitHub Actions with actual providers.

## Sanity test isolation

The seed and setup test harnesses use a local mock API. `PROTI_SANITY_API_BASE_URL` is an **internal test override**; leave it unset in normal development/production, where API calls should target the configured Sanity project.

## CI

The `Studio` GitHub Actions job runs `pnpm test:proti` after frozen workspace installation. Tests isolate inherited environment variables so an external CI process variable does not cause unrelated test cases to fail. Avoid reintroducing hardcoded `SANITY_STUDIO_PREVIEW_URL` in the Studio job.

Do **not** run `pnpm proti:init` as a regression check in the maintained source checkout. Use these tests, which operate on disposable repositories.

See [Project Initialization](PROJECT_INITIALIZATION.md) and [Setup Check](PROTI_CHECK.md).
