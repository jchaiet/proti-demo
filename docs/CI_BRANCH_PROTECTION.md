# CI and Branch Protection

This guide describes the v0.4 CI workflow and intended branch-protection setup. The current workflow was audited against `.github/workflows/ci.yml`; always confirm ruleset enforcement in GitHub repository settings (the ruleset itself is managed by GitHub, not this Markdown file).

## Purpose

The CI workflow is Proti's automated pre-merge quality gate.

When a pull request targets `main`, GitHub runs the required validation suite. The PR cannot be merged until all required checks pass.

After the PR is merged, CI runs again against the resulting `main` branch.

## CI Triggers

```yaml
on:
  pull_request:
  push:
    branches:
      - main
```

This provides:

```text
Pull request
→ Pre-merge validation

Push / merge to main
→ Post-merge verification
```

## Required CI Jobs

### Studio

```text
Frozen workspace install
Run `pnpm test:proti` (initializer, Git safeguards, seed/check, acceptance)
Run Studio tests
Build Studio (mode-specific public production Presentation URL; no hardcoded localhost override)
```

### Web

```text
Install dependencies
Run Vitest
Generate Next.js route types
Run TypeScript
Run ESLint
Build production Web app
```

Type checking must generate Next.js types first:

```bash
pnpm exec next typegen && pnpm exec tsc --noEmit
```

### Playwright Smoke

Runs functional browser tests against a production build using Chromium desktop/mobile and Firefox desktop/mobile-width projects. Both Playwright jobs use `http://localhost:3000`, `pnpm exec next start -p 3000`, `PLAYWRIGHT_SKIP_WEBSERVER="0"`, and `E2E_HOME_PATH=/`. Readiness is `/api/health`, while route assertions require published Sanity Site/Home content and a `localhost` Site domain.

### Playwright Visual

Runs required visual regression tests against the approved Chromium baselines:

```text
chromium-desktop
chromium-mobile
```

Visual regression is now blocking.

## Required Status Checks

The protected `main` branch requires:

```text
Studio
Web
Playwright smoke
Playwright visual
```

If any required check fails, GitHub prevents the PR from being merged.

## Branch Ruleset

Configure the `main` ruleset under:

```text
Repository
→ Settings
→ Rules
→ Rulesets
```

Recommended rules:

```text
Require a pull request before merging              ON
Require status checks to pass before merging       ON
Require conversation resolution before merging     ON
Require branch to be up to date before merging     Optional
Require signed commits                             OFF
Require merge queue                                OFF
```

Force pushes and deletion of `main` should remain disabled.

## Pull Request Flow

```text
Feature branch
      ↓
Open PR to main
      ↓
Studio
Web
Playwright smoke
Playwright visual
      ↓
All required checks pass
      ↓
Review conversations resolved
      ↓
Merge
      ↓
CI runs again on main
      ↓
Vercel production deployment
```

## Vercel Deployment

The Web application is hosted on Vercel.

GitHub Actions and Vercel use separate environment-variable systems. A value configured as a GitHub secret is not automatically available to Vercel.

The Vercel production project must contain the environment variables required by the Web application, including:

```text
NEXT_SANITY_PROJECT_ID
NEXT_SANITY_DATASET
NEXT_SANITY_STUDIO_URL
SANITY_API_READ_TOKEN
SANITY_API_WRITE_TOKEN
SANITY_REVALIDATE_SECRET
```

The current Proti production deployment has been validated successfully on Vercel.

## Runtime Versions

```text
Node: 24.19.0
pnpm: 10.34.1
```

Keep local development aligned with CI. A root `.nvmrc` containing `24.19.0` is recommended.

## pnpm Workspace Cache

CI uses the root workspace lockfile:

```yaml
cache: pnpm
cache-dependency-path: pnpm-lock.yaml
```

A first-run message such as `pnpm cache is not found` is normal.

## Local Mino Tarball

Web currently consumes:

```text
web/mino-ui-0.0.3.tgz
```

When Mino changes, bump its version and create a **new versioned tarball filename**; do not silently replace bytes behind an existing committed version. Update Web's tarball reference and the root lockfile:

```bash
pnpm install --no-frozen-lockfile
pnpm install --frozen-lockfile
```

Commit the new tarball, updated `web/package.json`, and `pnpm-lock.yaml` together.

## Independent-project prerequisites

GitHub Actions secrets/variables are set **per repository**, not inherited from the demo or Vercel. The published Sanity Site must include `localhost` and a published homepage for CI smoke/visual tests. New projects should run `pnpm proti:visual:init` once and commit **their own** desktop/mobile baselines before requiring visual CI. The Studio job must not pass `SANITY_STUDIO_PREVIEW_URL=http://localhost:3000` in CI; the tracked `studio/.env.production` controls Production Presentation.

Source checkout safety is protected by `git config --local proti.sourceRepository true` and the guarded `proti:init --new-project` flow; source and independent sites must retain separate Git histories.

## Result

```text
Code change
→ PR
→ Automated quality gates
→ Merge
→ main verification
→ Production deployment
```
