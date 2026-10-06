# Proti Release / Repo Hygiene Checklist

Use this after a clean setup rehearsal and before tagging or releasing a Proti baseline.

## Repository Hygiene

- [ ] `git status` is clean before release.
- [ ] `web/.env.local` is ignored.
- [ ] `web/e2e/.env.e2e` is ignored.
- [ ] `web/.env.example` is committed.
- [ ] `web/e2e/.env.e2e.example` is committed.
- [ ] `test-results/` is ignored.
- [ ] `playwright-report/` is ignored.
- [ ] Playwright baseline screenshots under `e2e/__screenshots__/` are committed.
- [ ] No temporary ZIPs, reports, debug output, generated test artifacts, or local-only files are tracked.
- [ ] `pnpm-lock.yaml` files are current.
- [ ] README instructions match the actual package scripts.

Recommended `.gitignore` env pattern:

```gitignore
.env*
!.env.example
!e2e/.env.e2e.example
```

## Studio Validation

From `studio/`:

```bash
pnpm test
pnpm build
```

Run lint as configured by the Studio repository/package.

## Web Validation

From `web/`:

```bash
pnpm test:run
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

## Production Playwright Validation

Run the production application:

```bash
pnpm build
pnpm start
```

With `e2e/.env.e2e` configured for `http://localhost:3000` and `PLAYWRIGHT_SKIP_WEBSERVER=1`:

```bash
pnpm test:e2e:smoke
pnpm test:e2e:visual
```

Only run `pnpm test:e2e:update` when intentionally approving a visual change.

## Functional Sanity Checks

Verify representative content after deployment:

- [ ] Page publish/update
- [ ] Blog publish/update
- [ ] Author publish/update
- [ ] Taxonomy changes
- [ ] Navigation changes
- [ ] Modal behavior
- [ ] Translations/language selector
- [ ] Document List search/filter/sorting
- [ ] Sanity webhook revalidation without redeploy

## Documentation

- [ ] Root README matches repository structure.
- [ ] Web README matches current runtime/test behavior.
- [ ] Studio README matches current authoring behavior.
- [ ] Environment variable templates contain placeholders only—never real secrets.
