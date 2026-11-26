# Proti Release / Repository Hygiene Checklist — v0.7.0

Use this checklist **before merging the v0.7.0 release PR**, then complete the deployment and tagging items only after `main` is green. Checkboxes are intentionally unchecked: local verification was reported successful, but the release itself has not yet been signed off.

## 1. Release contents and versions

- [ ] Root `package.json`, `web/package.json`, and `studio/package.json` all declare version `0.7.0`.
- [ ] `CHANGELOG.md` contains the v0.7.0 entry without changing earlier release history.
- [ ] Review [v0.7.0 release notes](releases/v0.7.0.md) and [SEO/GEO guidance](SEO_GEO.md).
- [ ] The independently versioned `web/mino-ui-0.0.6.tgz` is present and matches the `mino-ui` dependency in `web/package.json`.
- [ ] Existing dependencies (including Mino UI) have not been changed just to bump the Proti version.
- [ ] Root `pnpm-lock.yaml` resolves cleanly with the updated manifests; commit any lockfile changes only if the package manager generates them.
- [ ] The release PR includes only intended changes; no temporary files, reports, or local credentials.

## 2. Repository and environment hygiene

- [ ] Local secrets such as `web/.env.local`, `web/e2e/.env.e2e`, Studio private env files, and deployment credentials remain ignored/untracked.
- [ ] Placeholder-only `web/.env.example` and `web/e2e/.env.e2e.example` are tracked.
- [ ] `test-results/`, `playwright-report/`, and Lighthouse generated results are untracked/ignored.
- [ ] All version-controlled fixture baseline PNGs under `web/e2e/__screenshots__/` are present and reviewed.
- [ ] The production Vercel build **does not** set `PROTI_VISUAL_FIXTURES=1`; confirm the public fixture routes return 404.
- [ ] The Web/Studio env settings use the expected Sanity project/dataset; secrets are not printed by diagnostics.
- [ ] The local Mino tarball matches the lockfile. If it changes in a future release, use a _new_ tarball version/name rather than modifying existing bytes in place.

Example ignore rules (verify against the actual repository rather than replacing the existing `.gitignore`):

```gitignore
.env*
!.env.example
!e2e/.env.e2e.example
```

## 3. Reproducible installation and developer verification

From the repository root, using Node and pnpm versions supported by this project (Web declares `pnpm@10.34.1`):

```bash
pnpm install --frozen-lockfile
pnpm test:proti
pnpm test:proti:dx
pnpm proti:env:check
pnpm verify:all
```

- [ ] Frozen-lockfile installation succeeds **without** loosening `--frozen-lockfile`.
- [ ] Root initializer/environment/DX regression tests pass.
- [ ] `pnpm verify:all` finishes all configured stages successfully, including Web/Studio checks, visual, accessibility, Grid layout and performance verification.
- [ ] Web and Studio production builds, lint, type checking, and unit tests are green.
- [ ] Reviewed snapshots are committed; no `--update-snapshots` command was used merely to make tests green.
- [ ] If initialization changed, rehearse `pnpm proti:init --new-project` only in a disposable clone (it resets Git history after confirmation), then run `pnpm proti:check` and seed checks with a test Sanity project.

The v0.7.0 root workflows are `pnpm verify:quick`, `pnpm verify:fixtures`, `pnpm verify:performance`, and `pnpm verify:all`. `pnpm proti:commands` displays the workflow reference. `pnpm verify:all --dry-run` displays commands without executing them.

## 4. Playwright and performance validation

- [ ] Fixture-mode visual regression and WCAG accessibility checks pass on desktop and mobile.
- [ ] Grid image layout regression passes with intentionally delayed image responses.
- [ ] Lighthouse budgets pass across desktop/mobile Hero, Grid, and Navigation fixtures: score ≥ 90, LCP ≤ 2,500 ms, CLS ≤ 0.1; TBT ≤ 200 ms is warning-only.
- [ ] Lighthouse reports and the summary are available for review, including on failures.
- [ ] CMS-backed production smoke coverage remains active separately from fixture tests.
- [ ] A normal production build has test-only fixture routes disabled.

The preferred combined commands are:

```bash
pnpm verify:fixtures
pnpm verify:performance
```

For a standalone CMS-backed smoke check, use a **non-fixture** production build, start it, and run the Web smoke suite with its usual local E2E configuration. Do not deploy a fixture-enabled test build.

If a visual baseline truly needs updating, use the fixture-specific specs and `--update-snapshots` deliberately, inspect the diff, and commit only the approved PNGs. **Do not use** the legacy `web` `test:e2e:update` script for the current deterministic fixture suite; it still points to `e2e/visual.spec.ts`.

## 5. Security and configuration readiness

- [ ] Review dependency audit findings and any documented exceptions.
- [ ] Confirm public env values are appropriate and secrets remain server-side.
- [ ] Confirm Form webhook destinations and credentials are valid in production (including correct quoting of JSON values in Vercel configuration).
- [ ] Confirm Poll duplicate-vote handling, cookie behavior, and result rendering use the intended production configuration.
- [ ] Confirm preview, webhook revalidation, and write-token permissions are still correctly scoped.
- [ ] Run `pnpm proti:check` for live setup/Sanity connectivity when appropriate; it is **not** the same as the offline environment preflight.

## 6. CI sign-off (release pull request)

Confirm the **actual repository** checks, rather than assuming local success implies CI success:

- [ ] Proti initialization / DX checks.
- [ ] Web lint, typecheck, build, and unit tests.
- [ ] Studio tests and build.
- [ ] CMS-backed Playwright smoke checks.
- [ ] Deterministic fixture visual and accessibility checks, desktop and mobile.
- [ ] Lighthouse performance-budget workflow (including report artifacts).
- [ ] No unexpected skipped/disabled required checks.
- [ ] Required branch protections/status checks are green before merging.

## v0.7.0 Feature and Production Safety Gates

- [ ] Notice and Metrics render correctly on supported Page, Blog and reusable content, including desktop/mobile layouts.
- [ ] Mino UI 0.0.6 tarball, Web dependency manifest and pnpm lockfile agree; frozen installation passes.
- [ ] Conditional field visibility and client validation work for Select/Radio/Checkbox triggers, nested fieldsets, required fields and multistep flows.
- [ ] API tampering regressions pass: invalid triggers and unknown/disabled fields are rejected; hidden values are discarded before forwarding.
- [ ] **Deploy Web before Studio**; then submit a safe published conditional form and verify that only visible values reach the configured webhook.
- [ ] Existing nonconditional forms, polls and file-upload safeguards remain intact.
- [ ] Signed Sanity revalidation invalidates the published Host-to-Site search cache; verify locale/host separation and preview bypass.
- [ ] Search and Document List regression checks pass, including actual page-2 pagination, sorting, filtering, debounce and back navigation.
- [ ] Review the Batch 3C timing comparison and correctness results without treating small-dataset timings as a production guarantee.

## 7. Production smoke (after deployment, before tagging)

Use a safe test page, form, and poll so smoke checks do not disturb real visitors' content or votes.

- [ ] Site homepage and representative Page/Blog/Author routes load on production.
- [ ] EN/ES links and locale selector resolve only valid translations; canonical, hreflang, metadata, structured data, sitemap, and robots are sensible.
- [ ] Representative Grid, Navigation/megamenu, tabs, carousel, modal, and document-list controls work at desktop/mobile widths.
- [ ] A test Form submission succeeds and is received at the intended destination; errors and diagnostics are appropriate.
- [ ] A controlled Poll accepts a first vote, blocks a duplicate vote, and displays the intended result/previously-voted state after refresh.
- [ ] Preview/Draft Mode remains private; publishing and webhook revalidation update the public site without redeploying.
- [ ] Production URLs cannot access the visual fixture routes.
- [ ] No production console errors or unexpected 4xx/5xx responses during smoke testing.

## 8. Documentation and release notes

- [ ] `docs/GETTING_STARTED.md`, `docs/ARCHITECTURE.md`, `docs/COMPONENTS.md`, and `docs/TESTING.md` reflect the current implementation.
- [ ] `docs/RELEASE_CHECKLIST.md` (this file) uses v0.7.0 versions and current developer commands.
- [ ] `docs/releases/v0.7.0.md` is reviewed for factual accuracy and migration notes.
- [ ] `CHANGELOG.md` accurately distinguishes completed verification from checks still pending.
- [ ] Document any observed breaking changes or additional migration steps before release.

## 9. Merge, deploy, tag, and publish

Only after the previous checks pass:

```bash
git checkout main
git pull --ff-only
git status --short
# Confirm the deployed main commit and GitHub Actions checks are green.
git tag -a v0.7.0 -m "Proti v0.7.0"
git push origin v0.7.0
```

- [ ] Release PR merged to `main`, branch checks green, and working tree clean.
- [ ] Web and Studio are deployed from the intended commit and production smoke checks pass.
- [ ] `v0.7.0` annotated tag is created on the verified release commit and pushed.
- [ ] GitHub Release is published using `docs/releases/v0.7.0.md` as the source for the notes.
- [ ] Release tag, commit, and deployment are recorded for rollback if necessary.
