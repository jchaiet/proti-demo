# Test and regression workflow (v0.4.0)

Proti validates the **root setup scripts**, **Sanity Studio**, and **Next.js Web** independently. Browser E2E commands are declared in `web/package.json` and should be executed from `web/` (or through `pnpm --dir web …`).

## Automated commands

| Context   | Command                                                                                                       | Purpose                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Root      | `pnpm test:proti`                                                                                             | Init, Git guard, seed, setup-check, visual-init, production-config, and acceptance tests |
| Root      | `pnpm test:proti:integration`                                                                                 | Disposable fresh-project lifecycle acceptance test                                       |
| Root      | `pnpm proti:check`                                                                                            | Read-only check of **this** local project, its Git state, env, and published Sanity Site |
| `studio/` | `pnpm test`, `pnpm build`                                                                                     | Studio Vitest + production bundle                                                        |
| `web/`    | `pnpm test:run`                                                                                               | Web Vitest                                                                               |
| `web/`    | `pnpm exec next typegen && pnpm exec tsc --noEmit`                                                            | Next route types + TypeScript                                                            |
| `web/`    | `pnpm lint`, `pnpm build`                                                                                     | ESLint + Next production build                                                           |
| `web/`    | `pnpm test:routing`, `pnpm test:search`, `pnpm test:document-list`, `pnpm test:seo`, `pnpm test:revalidation` | Focused regressions                                                                      |
| `web/`    | `pnpm test:e2e:smoke`, `pnpm test:e2e:visual`, `pnpm test:e2e`                                                | Playwright smoke, visuals, full E2E                                                      |

The Studio package may not expose a dedicated lint command. Use the package's actual scripts rather than assuming `pnpm lint` exists there.

## Fresh-project acceptance test and Git safety

`pnpm test:proti:integration` creates a disposable project and simulates the complete setup flow, using a local mock Sanity API and mocked visual commands. It covers Git independence, first init/reinit, public env files, Site seeding, production URL updates, and screenshot lifecycle **without** modifying a real Sanity project or any production repository.

The unit/acceptance suite additionally verifies:

- Maintained-source local Git marker (`proti.sourceRepository=true`) refuses all init attempts.
- An unmodified starter clone requires `--new-project` and typed `RESET GIT HISTORY` confirmation.
- Dirty or unexpected Git repositories are not detached; existing remote/history are preserved.
- New Site domains include `localhost`, while established projects can preserve intentional edits.
- Already initialized projects preserve their Git history, local tokens, and screenshots.

Do **not** test initialization by running it against the maintained `proti-demo` checkout; use the automated disposable tests. The maintained source's normal `proti:check` recognizes its original remote if marked locally.

## Playwright projects and readiness

`web/playwright.config.ts` provides:

- `chromium-desktop` (1440 × 900) and `chromium-mobile` (Pixel 7 emulation) for smoke and visual assertions.
- `firefox-desktop` (1440 × 900) and `firefox-mobile` (narrow desktop viewport; **not** true Firefox Android emulation) for functional coverage.
- Optional `webkit-mobile` with `PLAYWRIGHT_INCLUDE_WEBKIT=1` and the corresponding browser installation.

The default **browser base URL** is `http://localhost:3000`. The default **web server** is `pnpm exec next start -p 3000`, with `reuseExistingServer: false`. **Readiness** is checked at `/api/health`; smoke assertions then verify actual CMS-backed `/` routes. A 200 health check with homepage 404 points to the published Sanity Site/domain/homepage, not a Playwright readiness bug. A host-based Site lookup treats `localhost` and `127.0.0.1` as different hosts.

### Local automatic server workflow (recommended)

Ensure no server is occupying port 3000. With a published homepage and local Web Sanity environment:

```bash
pnpm --dir web exec playwright install chromium firefox
pnpm --dir web build
cd web
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_WEBSERVER=0 pnpm test:e2e:smoke
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_WEBSERVER=0 pnpm test:e2e:visual
```

This lets Playwright start and stop its own production server. For an already running **production** server, use `PLAYWRIGHT_SKIP_WEBSERVER=1` instead. Do not start a server manually and leave `PLAYWRIGHT_SKIP_WEBSERVER=0`: the config intentionally refuses stale-server reuse.

E2E route selections are in `web/e2e/.env.e2e` (ignored); use the committed `.env.e2e.example`. Only add routes that exist in the chosen Sanity dataset.

## First-time project-owned visual baselines

A new independent project must **not** inherit Proti demo screenshots. First-time initialization removes demo PNGs; after Site/homepage seeding and publishing, run from the **root**:

```bash
pnpm --dir web exec playwright install chromium
pnpm proti:visual:init
```

This command checks port 3000 (override with `PROTI_VISUAL_PORT`), builds Web, captures desktop/mobile screenshots against a production server, and verifies both expected `home.png` files. It refuses to replace existing snapshots unless you use **`--force`**. Review and commit the result. CI only compares committed baselines.

**Current v0.4.0 limitation:** screenshots depend on published Sanity content. Text, navigation, or footer changes can cause visual diffs without a layout regression. Investigate actual/diff images; do not silently increase `maxDiffPixelRatio` (currently `0.002`) or auto-approve CMS changes. Deterministic fixture-driven visual routes and component states are planned for **v0.5.0**; a separate regression Sanity dataset is not required for the current visual suite.

## Screenshot approval policy

1. Run `pnpm test:e2e:visual` **without** update flags.
2. Inspect the expected/actual/diff images, `web/test-results/`, and HTML report (`pnpm test:e2e:report`).
3. Fix unintended changes. If the changed UI/content is deliberate, approve it explicitly.
4. In `web/`, use `pnpm test:e2e:update` (or root `pnpm proti:visual:init --force` for complete project baseline refresh).
5. Review `git diff -- web/e2e/__screenshots__/` and commit only approved snapshots.
6. Rerun `pnpm test:e2e:visual` **without** snapshot update flags.

## CI contract

GitHub Actions runs separate `Studio`, `Web`, `Playwright smoke`, and `Playwright visual` jobs; the visual job depends on passing smoke checks. Both Playwright jobs build Next.js first and use:

```yaml
PLAYWRIGHT_BASE_URL: http://localhost:3000
PLAYWRIGHT_WEB_SERVER_COMMAND: pnpm exec next start -p 3000
PLAYWRIGHT_SKIP_WEBSERVER: "0"
E2E_HOME_PATH: /
```

The Studio job must not inject a hardcoded `SANITY_STUDIO_PREVIEW_URL` override (the `.env.production` URL is authoritative). CI uses Node 24.19.0, pnpm 10.34.1, and `pnpm install --frozen-lockfile`. `studio/.env.development` and `.env.production` must be tracked if they carry the public preview URLs.

## Manual production integration checks

Automated tests don't replace deploying and checking a real independent implementation. Verify:

- Sanity Site routing, published homepage, navigation, and locale URLs.
- Draft preview appears in Studio Presentation but **not** in unauthenticated public Web.
- Publish → webhook → public page updates without redeploy.
- Blog, Author, Search/Document Lists, modal/forms, translations, and SEO outputs as authored.
- CI and Vercel secrets match their deployment targets, without leaking to client or Git.

See [Deployment](DEPLOYMENT.md), [Visual CI](VISUAL_CI.md), and [Release Checklist](RELEASE_CHECKLIST.md).
