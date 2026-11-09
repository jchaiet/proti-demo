# Proti v0.4.0 — release and repository checklist

Use this before merging the release PR, tagging, and publishing a GitHub release. **v0.4.0 is the current release target**; checking boxes or creating documentation does not imply the Git tag exists.

## 1. Version and dependency alignment

- [ ] Root, `web/`, and `studio/` `package.json` versions reflect **`0.4.0`** (check Web is no longer `0.3.1s`).
- [ ] Web Next.js and `eslint-config-next` are aligned to the tested compatible version (currently **16.4.3**, if the dependency set remains unchanged).
- [ ] Local Mino UI tarball exists at the versioned path referenced in `web/package.json` (currently `mino-ui-0.0.3.tgz`); Mino is independently versioned.
- [ ] New Mino bytes are shipped under a new Mino version/tarball filename; do not change bytes behind an already committed version.
- [ ] `pnpm-lock.yaml` regenerated when required, and `pnpm install --frozen-lockfile` passes with Node **24.19.0** and pnpm **10.34.1**.
- [ ] `CHANGELOG.md` has a v0.4.0 entry; [v0.4.0 release notes](releases/v0.4.0.md) are reviewed.

## 2. Git and source-repository safeguards

- [ ] Maintained `proti-demo` checkout is intentionally marked **locally** with `git config --local proti.sourceRepository true`.
- [ ] `pnpm proti:check` accepts the legitimate source remote; **do not run** `proti:init` in that checkout.
- [ ] `pnpm test:proti` verifies refusal to initialize the maintained source, clean-clone confirmation, dirty-tree protections, custom remote preservation, and ordinary reinit safety.
- [ ] GitHub `main` history is intact, force pushes disabled by branch ruleset; release flows through a PR.
- [ ] No secrets or accidental independent-project `.git` backup directories were committed.

## 3. Independent-project acceptance and setup

```bash
pnpm test:proti:integration
pnpm test:proti
pnpm proti:check
```

- [ ] Full disposable fresh-project acceptance test passes; it does not touch live Sanity/Vercel.
- [ ] A **clean separate starter clone** uses `pnpm proti:init --new-project` and typed `RESET GIT HISTORY` confirmation; never test this in the maintained source checkout.
- [ ] New Site domains include `localhost` and the chosen production hostname; production hostname is canonical.
- [ ] Seed supports Site-only and optional minimal Home/Header/Footer/Navigation (`pnpm proti:seed --starter-content`), without overwriting existing content.
- [ ] First initialized project deletes demo screenshot PNGs; repeat init preserves project-owned screenshots and secrets.
- [ ] `proti:configure:production --url=https://…` changes Studio production Presentation URL only, and warns about missing production Site host.
- [ ] Studio CLI uses environment project/dataset/App ID, not hardcoded demo identifiers.

## 4. Repository and environment hygiene

- [ ] `web/.env.local`, `studio/.env.local`, and `web/e2e/.env.e2e` are ignored/untracked.
- [ ] `studio/.env.development` and `studio/.env.production` are tracked and contain **public URLs only**.
- [ ] Any committed `.env.example` and `e2e/.env.e2e.example` contain placeholders, not credentials.
- [ ] `studio/.env.local` does **not** set the legacy `SANITY_STUDIO_PREVIEW_URL` override.
- [ ] CI Studio job does **not** force `SANITY_STUDIO_PREVIEW_URL=http://localhost:3000`.
- [ ] GitHub Actions and Vercel secrets/variables are configured separately; no tokens in `NEXT_PUBLIC_*`.
- [ ] `web/e2e/__screenshots__/chromium-desktop/home.png` and `chromium-mobile/home.png` are committed for the current implementation.
- [ ] No temporary ZIPs, test reports, build artifacts, or credentials are tracked.

Suggested ignore exceptions (adapt to the existing `.gitignore`):

```gitignore
.env*
!.env.example
!e2e/.env.e2e.example
!studio/.env.development
!studio/.env.production
```

## 5. Studio and Web regression

From the root:

```bash
pnpm --dir studio test
pnpm --dir studio build
pnpm --dir web test:run
pnpm --dir web exec next typegen
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
pnpm --dir web build
```

- [ ] All tests/builds pass with the release lockfile and Mino tarball.
- [ ] No unintended schema/resolver/component changes; Blog, Page, Author, navigation, modal, form, taxonomy, Search, Document Lists remain healthy.
- [ ] Previous SEO/GEO requirements remain correct: canonical, hreflang, structured data, sitemap, robots, and exact locale links.

## 6. Playwright and visual regression

- [ ] The published test Site recognizes `localhost` and has a homepage, so browser smoke won't return application-level 404.
- [ ] `web/playwright.config.ts` uses `http://localhost:3000`, `next start`, `/api/health`, and refuses stale server reuse.
- [ ] Run production-build tests from `web/` with port 3000 free, or set `PLAYWRIGHT_SKIP_WEBSERVER=1` only when intentionally managing the production server yourself.

```bash
pnpm --dir web test:e2e:smoke
pnpm --dir web test:e2e:visual --project=chromium-desktop --project=chromium-mobile
pnpm --dir web test:e2e
```

- [ ] Compare screenshots; **do not** update baselines as a prerequisite for passing CI.
- [ ] If a genuine approved visual/content change requires a new baseline, run `pnpm proti:visual:init --force` in a configured independent project or `pnpm test:e2e:update` from `web/`; inspect and commit the PNGs, then rerun comparison.
- [ ] Remember the current baseline depends on published Sanity content; deterministic fixtures are deferred to v0.5.0.

## 7. Real independent deployment verification

- [ ] Web Vercel project is configured with **Root Directory `web`**, correct Sanity env, public hostname, and lockfile/Mino tarball.
- [ ] Sanity Studio deployed independently to the intended Sanity project/dataset/App ID.
- [ ] Production Presentation uses `studio/.env.production` and the real HTTPS Web URL, **not localhost**.
- [ ] Published Site → Routing includes both `localhost` and Web production hostname; canonical domain is the production host.
- [ ] Correct `/api/revalidate` webhook URL, secret, source filter/projection (`before()`/`after()`), drafts/versions disabled.
- [ ] Unpublished draft appears in Presentation but **not** public Web; publish triggers public revalidation without redeploy.
- [ ] Homepage, Blog, Author, locale routes, forms/polls, navigation, Search/Document Lists, SEO canonical/hreflang/JSON-LD checked as authored.

## 8. GitHub CI and branch protection

- [ ] `Studio` check passes Proti setup tests plus Studio tests/build.
- [ ] `Web` check passes unit, TypeScript, lint, build.
- [ ] `Playwright smoke` passes Chromium/Firefox desktop/mobile-width coverage.
- [ ] `Playwright visual` passes Chromium desktop/mobile; its failure remains **blocking**.
- [ ] CI uses frozen install, Node 24.19.0, pnpm 10.34.1, and appropriate GitHub secrets.
- [ ] Force pushing to protected `main` remains disallowed; merge the release via PR.

## 9. Documentation and release

- [ ] Root/Web/Studio READMEs and `docs/PROJECT_INITIALIZATION.md`, `CONFIGURATION.md`, `DEPLOYMENT.md`, `TESTING.md`, `EDITOR_GUIDE.md` describe actual v0.4 behavior.
- [ ] Historic v0.3.0/v0.3.1 release notes remain unchanged.
- [ ] New `docs/releases/v0.4.0.md` is reviewed, including known limitation of CMS-dependent visual baselines.
- [ ] Check `CHANGELOG.md` (not included in the documentation upload) for the v0.4 entry.
- [ ] Release PR has passed all checks on GitHub, and merged `main` is green.
- [ ] Package versions and lockfile are committed; verify release artifact is complete.

Only after the release PR is merged and the intended tag does not already exist:

```bash
git switch main
git pull --ff-only origin main
git tag -a v0.4.0 -m "Proti v0.4.0"
git push origin v0.4.0
```

Publish the GitHub release using [v0.4.0 notes](releases/v0.4.0.md). Do not rewrite history, force tags, or bypass protected-branch rules to release.
