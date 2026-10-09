# Changelog

All notable Proti baseline changes are recorded here.

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
