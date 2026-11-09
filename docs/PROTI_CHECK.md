# Proti setup check (v0.4.0)

`pnpm proti:check` validates a configured implementation **without changing Git metadata, local files, or Sanity documents**. Run it from the repository root after initialization/seeding and after production URL changes.

```bash
pnpm proti:check
```

## What it checks

| Category                  | Checks                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Git                       | Repository rooted in current project; custom project remote independent of demo; maintained source acknowledged by its local-only marker |
| Project                   | Valid `proti.config.json` and generated root/Web/Studio package names                                                                    |
| Web                       | Sanity project/dataset/Studio URL match config; operational server-only secrets present (missing may warn)                               |
| Studio                    | Shared project/dataset/title; development and production Presentation URLs align with mode files                                         |
| Studio deployment hygiene | Warns when public mode files are Git-ignored or CI overrides the production URL with localhost                                           |
| Site                      | Reachable published Site in the configured Sanity dataset, key, domain/canonical, default and supported locales                          |
| Localhost                 | Warns if development Web URL uses localhost but configured Site domains omit localhost                                                   |
| Visual                    | Warns if project-specific Chromium desktop/mobile baselines are absent                                                                   |

**Source repository:** From the maintained original `proti-demo` checkout, set once:

```bash
git config --local proti.sourceRepository true
```

This is a per-checkout `.git/config` setting, **not** a tracked exception or permission to use init on the original repository. Once marked, the checker accepts its intentional source remote, while `proti:init` refuses to run there. New clones do **not** inherit the marker.

## Readiness and warnings

A completely configured independent project prints a set of `✓` checks and ends with `Proti is ready.` If some optional or not-yet-deployed pieces remain, it can still report readiness **with warnings**. Examples:

- No production HTTPS Presentation URL yet: deploy Web, then use `pnpm proti:configure:production --url=https://...` and redeploy Studio.
- Missing visual baselines: seed/publish homepage, run `pnpm proti:visual:init`, review/commit screenshots.
- Missing operational read/write token or webhook secret: configure features that require those operations; do not expose secrets.
- Source Site domains differ from published Site metadata: check intentional drift and keep routing consistent.
- `localhost` missing: add it to **both** local config and published Site Routing for CI/local host resolution.
- CI process sets a legacy `SANITY_STUDIO_PREVIEW_URL`: remove that environment override from the Studio job.

A missing published Site, Sanity connectivity/authentication failures, invalid or mismatched project configuration, or material environment mismatch are errors. The checker doesn't create CMS content; seed first with `pnpm proti:seed` or `pnpm proti:seed --starter-content`.

## Tests

```bash
pnpm test:proti
pnpm test:proti:integration
```

The check tests use a mock local Sanity API; no production Sanity changes occur. `PROTI_SANITY_API_BASE_URL` is a test-only override and should not be set for normal use.

See [Project Initialization](PROJECT_INITIALIZATION.md), [Configuration](CONFIGURATION.md), and [Initializer Tests](INITIALIZER_TESTS.md).
