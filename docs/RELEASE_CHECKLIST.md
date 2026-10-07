# Proti Release Checklist

Use this checklist before creating a Proti release or baseline tag.

## Repository

- [ ] `git status` is clean.
- [ ] `main` contains the intended release commit.
- [ ] Root `pnpm-lock.yaml` is current.
- [ ] `web/mino-ui-0.0.2.tgz` and its lockfile checksum are in sync.
- [ ] No temporary/debug/report/ZIP files are tracked.
- [ ] Environment example files contain placeholders only.
- [ ] Documentation matches the current implementation.

## Studio

```bash
cd studio
pnpm test
pnpm build
```

- [ ] Studio tests pass.
- [ ] Studio build passes.

## Web

```bash
cd web
pnpm test:run
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

- [ ] Unit/integration tests pass.
- [ ] Next.js type generation succeeds.
- [ ] TypeScript passes.
- [ ] ESLint passes.
- [ ] Production build passes.

## Playwright

Against the production Web build:

```bash
pnpm build
pnpm start
pnpm test:e2e:smoke
pnpm test:e2e:visual
```

- [ ] Chromium smoke passes.
- [ ] Firefox smoke passes.
- [ ] Chromium desktop visual passes.
- [ ] Chromium mobile visual passes.

Only run `pnpm test:e2e:update` after reviewing and approving an intentional visual change.

## GitHub CI

- [ ] `Studio` passes.
- [ ] `Web` passes.
- [ ] `Playwright smoke` passes.
- [ ] `Playwright visual` passes.
- [ ] All required PR checks are green.
- [ ] The protected `main` ruleset is active.

## Vercel

- [ ] Production deployment succeeds.
- [ ] Production environment variables are present.
- [ ] Homepage loads.
- [ ] Representative secondary-locale route loads.
- [ ] Representative Blog route loads.
- [ ] Representative Author route loads.
- [ ] Search behaves correctly.
- [ ] Navigation works.
- [ ] Modal behavior works.

## Sanity / Content

- [ ] Page publish/update works.
- [ ] Blog publish/update works.
- [ ] Author publish/update works.
- [ ] Taxonomy changes propagate.
- [ ] Navigation changes propagate.
- [ ] Translation switching works.
- [ ] Document List search/filter/sorting works.
- [ ] Revalidation webhook updates deployed content without a redeploy.

## Release

When all required items are complete:

```bash
git checkout main
git pull

git tag -a v0.1.0 -m "Proti v0.1.0 - Initial stable baseline"
git push origin v0.1.0
```

Then create the matching GitHub Release.
