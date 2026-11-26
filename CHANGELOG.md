# Changelog

All notable Proti baseline changes are recorded here.

## v0.7.0 — Page Builder Expansion, Conditional Forms and Search Efficiency

### Added

- Notice / Callout block with neutral, information, success, warning and promotional variants, rich-text content, optional icon and CTAs.
- Metrics / Statistics block with default, card and divided presentations, responsive layouts, and text-based values, prefixes and suffixes.
- Conditional Form authoring for supported choice-field triggers and nested fieldsets, including across earlier multistep fields.
- Dynamic frontend field visibility, hidden-answer clearing, accessible change announcements and visibility-aware required-field handling.
- Trusted server-side form condition evaluation using published Sanity definitions; hidden values are excluded from webhook payloads and malformed or unauthorized submissions are rejected.
- Search performance instrumentation, benchmark comparison tools and live API contract regression checks.

### Improved

- Mino UI integration upgraded through version `0.0.6` for Grid image geometry and the new Notice/Metrics components.
- Global Search published Host-to-Site lookup now uses tagged caching with a 60-second fallback and signed-webhook invalidation. Local development and draft-mode lookups bypass the cache; Search API responses remain `no-store`.
- Document List search debounce and editable query state, including back navigation and preserving keystrokes during server responses.
- Search content-type contract and related resolver, filtering and pagination behavior.
- Form File Upload safeguards: unsupported active uploads cannot be newly authored or silently submitted.

### Fixed / Regression

- Grid image layout and its Proti integration after the Mino UI geometry correction.
- Document List taxonomy filtering and search input races; retained existing sort, filter, and pagination semantics.
- Test coverage for conditional fields, nested fieldsets, multistep flows, tampered submissions, search caching, webhook invalidation and search API contract behavior.

### Validation and release status

- Batch 0–3 implementation and `pnpm verify:all` were reported passing during v0.7.0 development, including Playwright fixture checks after clearing port 3000.
- In the supplied local benchmark, empty-query median response time improved from **135.3 ms to 8.3 ms** and a two-result search improved from **280.2 ms to 159.1 ms**. These measurements are environment-specific; larger content collections were not benchmarked.
- Final release PR/CI, deployment smoke, production webhook/cache freshness checks, package-version alignment, and publishing the `v0.7.0` tag require separate sign-off. This entry does not declare the release published.

## v0.6.0 — Production Readiness, Accessibility, Performance and Developer Experience

### Added

- Production configuration readiness checks, dependency-security review, and regression coverage for security-sensitive behavior.
- Forms and Polls diagnostics for checking submission, voting and deployment configuration.
- Automated WCAG A/AA accessibility tests against deterministic visual fixtures on desktop and mobile.
- Lighthouse performance baselines and enforceable CI budgets for the Hero, Grid, and Navigation fixtures, using three runs per profile and median results.
- A standalone performance-budget GitHub Actions workflow with saved desktop/mobile reports and summaries, including when an assertion fails.
- Read-only, offline Web/Studio environment preflight via `pnpm proti:env:check`, with development, CI, and production modes.
- Repository-wide verification commands: `pnpm verify:quick`, `pnpm verify:fixtures`, `pnpm verify:performance`, and `pnpm verify:all`, with a dry-run option.
- Fresh-project developer-experience regression coverage for initialization, environment validation, safe Git handling, and developer tooling.
- Updated onboarding, architecture, component-extension, visual testing, performance, and developer workflow documentation.

### Improved

- Clearer, actionable environment errors without echoing secret values; existing `pnpm proti:check` remains the live setup/readiness check.
- Grid image-tile layout reserves image space before loading, preventing visible content shifts on the tested fixtures.
- Footer link minimum target height for WCAG 2.2 target-size coverage.
- Visual regression baselines reviewed and refreshed for the intentional Grid and footer layout changes.
- CI diagnostics: performance results are retained even if a blocking Lighthouse assertion fails.

### Fixed / Regression

- Resolved Grid fixture layout shift on both desktop and mobile without weakening the CLS budget.
- Corrected developer documentation references that still described visual fixtures as planned or pointed at legacy CMS-dependent snapshots.
- Preserved production-only fixture protection: fixture routes remain unavailable unless explicitly enabled for testing.

### Validation

- `pnpm verify:all`: **10 steps passed**, reported in the final v0.6.0 regression run.
- Most recent six Lighthouse fixture/profile scores: **100/100** each; measured CLS **0.000** for all six; all blocking budgets passed.
- Earlier desktop/mobile visual and accessibility CI checks were reported green after reviewed baseline updates.
- Final release-PR CI, frozen-lockfile installation, production smoke tests, and publication of the `v0.6.0` tag remain release checklist items, not claims of completed release.

## v0.5.0 — Deterministic Visual Regression

### Added

- CMS-independent, version-controlled visual fixtures through the real Proti block and navigation mappers and Mino UI components.
- Chromium desktop/mobile screenshots for Hero, Content, Rich Text, Grid, Article/Resource Cards, Accordion, Tabs, Carousel, Header, Footer, dropdowns and megamenu states.
- Local SVG fixtures and test-only visual routes protected by `PROTI_VISUAL_FIXTURES`.
- Full fixture screenshot manifest and checks for all 37 expected baselines.

### Improved

- CI visual job compares deterministic fixtures instead of mutable published Sanity content; real-CMS smoke checks remain mandatory.
- Normal production CI validates that fixture routes return 404.
- `proti:visual:init` builds fixture mode and generates fixture baselines; `proti:check` verifies the correct new baselines instead of legacy `home.png`.
- Web visual scripts and testing/setup documentation aligned to the v0.5.0 workflow; optional legacy CMS snapshot scripts retained.

### Fixed / Regression

- Corrected the CI smoke hostname to `localhost` for Sanity Site domain matching.
- Corrected fixture selectors and test assumptions discovered during desktop/mobile Playwright integration.

### Validation

- Stages 1–7 reported passing, including GitHub Actions PR checks.
- Stage 8 setup-script unit/acceptance tests run locally in isolation; full final regression and release sign-off remain pending.

## v0.4.0 — Independent Project Initialization and Deployment

### Added

- Explicit independent-project initialization with `pnpm proti:init --new-project`, including typed confirmation before replacing inherited Git history.
- Git safety checks that protect established repositories, existing commits, remotes, uncommitted work, and reruns of initialization. The maintained Proti source checkout can be identified with the local Git setting `proti.sourceRepository=true`; this setting is not inherited by clones.
- Automated fresh-project acceptance tests covering initialization, Git independence, Sanity seeding, configuration, simulated visual baselines, production URL setup, and repeat initialization without using a live Sanity project or deploying an application.
- First-time Site domain initialization that includes `localhost` alongside the configured production domain, with the production hostname retained as the canonical domain.
- `pnpm proti:configure:production` for updating the production Presentation URL after the production hostname is known.
- Separate Studio development and production preview URL configuration via `studio/.env.development` and `studio/.env.production`.
- `pnpm proti:visual:init` for creating project-specific Chromium desktop and mobile screenshot baselines, with an explicit regeneration workflow.
- A lightweight `GET /api/health` endpoint for Playwright's application-server readiness checks.
- Comprehensive v0.4.0 initialization, configuration, deployment, testing, editor, and release documentation.

### Improved

- Reusable project setup across independent GitHub repositories, Sanity projects, Studio deployments, and Vercel sites.
- Environment-driven Studio CLI deployment settings for Sanity project, dataset, and optional Studio App ID; no hardcoded starter deployment identifiers.
- Setup validation with `pnpm proti:check`, including Site/domain alignment, Studio preview URL configuration, Git safety, required environment settings, and visual baseline presence.
- Independent Studio Presentation configuration for local development and deployed production sites.
- GitHub Actions coverage for Proti setup and acceptance tests, Studio tests/build, Web tests/type-check/lint/build, Playwright smoke tests, and Chromium visual regression.
- Playwright production-server startup and health-check readiness; browser navigation consistently uses `localhost` for hostname-based Site resolution.
- Initializer baseline lifecycle: inherited demo screenshots are cleared for a new project; generated project screenshots survive subsequent initialization.

### Fixed / Regression

- Prevented accidental Git history replacement when running initialization in an existing project or the maintained Proti source checkout.
- Corrected CI failures caused by mismatches between `localhost`, `127.0.0.1`, and Site domain routing.
- Removed the Studio CI preview URL override that conflicted with production-mode Studio configuration and setup tests.
- Isolated setup tests from inherited CI environment variables so warning-count assertions remain deterministic.
- Resolved Playwright visual-baseline drift discovered during independent-project testing; screenshot changes are reviewed and committed per project rather than copied between sites.

### Validation

- Verified an independently initialized project with its own GitHub repository, Sanity project/dataset, Sanity Studio deployment, and Vercel website.
- Verified production Presentation draft preview, draft isolation from public pages, publishing, and webhook-driven content revalidation.
- Reported green: Proti setup and fresh-project acceptance tests, Web and Studio regression suites/builds, Playwright smoke/visual suites, and GitHub Actions.
- The maintained source-repository Git safeguard was tested successfully in the original Proti checkout.

### Known Limitation / Future Work

- Current full-page visual snapshots still depend on published Sanity content. Stable repository-controlled visual fixtures and broader component-state coverage are planned for a future release; a dedicated regression Sanity dataset is optional, not required for v0.4.0.

## v0.3.0 — SEO/GEO and Locale Integrity

### Added

- Site canonical-domain-driven SEO origin used by canonical URLs, alternates, sitemap, robots, and structured data.
- Locale/hreflang validation and direct translation availability handling.
- Structured-data entity graph builders for Site/Organization, WebPage, BlogPosting, Person/ProfilePage, CollectionPage, and breadcrumbs.
- Editorial heading/image accessibility and SEO-output regression coverage.
- SEO/GEO, translation, architecture, deployment, testing, editor, and release documentation.

### Improved

- Default/unprefixed locale and exact-alternate language switching behavior.
- Author locale availability for profiles and connected Blog bylines.
- Semantic source-quality support for Blog reviews, authorship, citations, and discoverability.

### Fixed / Regression

- Blog/Author resolver normalization of missing `translatedLocales` arrays (runtime error during Playwright smoke tests).
- Next.js development-indicator visual snapshot drift; approved Chromium baselines regenerated after inspection.

### Validation

- Reported green: Mino UI, Web, Studio, root starter checks, Playwright development/production, and manual integration checks for routing, SEO/GEO, search, modals and revalidation.
- Local Mino tarball, lockfile, tracked CI workflows and example-env files still require verification in the release repository before tagging.

## v0.2.0 — Developer Experience

### Added

- Repository-level interactive initializer: `pnpm proti:init`.
- Generated `proti.config.json` for project/Sanity/Site configuration.
- Generated local Web and Studio environment files.
- Package-name initialization for root, Web, and Studio packages.
- `pnpm proti:seed` for idempotent Site creation.
- Optional `pnpm proti:seed --starter-content` flow.
- Minimal starter content for the default locale:
  - Home
  - Default Header
  - Default Footer
  - Default Navigation
- `pnpm proti:check` read-only setup validation.
- Regression tests for init, seed, and check workflows.
- Proti setup tests in CI.
- Project initialization documentation and release guidance.

### Changed

- Sanity Studio configuration is environment-driven rather than tied to a starter project ID.
- Locale initialization standardizes on lowercase language-region values such as `en-us`, `es-us`, and `fr-ca`.
- Mino UI packaging workflow now uses versioned tarballs instead of replacing different package bytes under the same tarball version.
- Navigation layout was widened relative to standard page blocks while retaining configurable Mino layout hooks.
- Playwright mobile visual baseline was refreshed for the intentional navigation spacing change.

### Validation

The v0.2 baseline is expected to pass:

```bash
pnpm test:proti
```

Studio tests/build, Web tests/type-check/lint/build, Playwright smoke, and Playwright visual regression checks are also required in CI.

## v0.1.0 — Production Baseline

Initial production-ready Proti baseline, including:

- Next.js + Sanity architecture
- Mino UI integration
- multi-site and locale-aware content
- Pages, Blogs, Authors, Taxonomy, Navigation, Redirects, Singletons, and Modals
- translation workflows and locale routing
- reusable content blocks
- Document List search, grouped taxonomy filters, and sorting
- Sanity Presentation / Visual Editing support
- webhook revalidation
- accessibility/component hardening
- responsive layout behavior
- Playwright smoke and visual regression coverage
- required GitHub Actions checks
