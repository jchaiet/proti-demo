# Proti

Proti is a reusable website and CMS starter built with **Next.js, Sanity Studio, and Mino UI**. It supports multi-site and multi-locale routing, structured content, translations, search, SEO/structured data, visual editing, webhook revalidation, automated testing, and CI.

**Release target: v0.4.0.** This release focuses on turning the starter into independently initialized and deployed projects. See [v0.4.0 release notes](docs/releases/v0.4.0.md) and the [release checklist](docs/RELEASE_CHECKLIST.md). Historical [v0.3.0](docs/releases/v0.3.0.md) and [v0.3.1](docs/releases/v0.3.1.md) notes remain available.

## Repository structure

```text
.
├── web/        Next.js website (Mino UI rendering, API routes, E2E)
├── studio/     Sanity Studio (schemas, editorial workflows, Presentation)
├── scripts/    Project initialization, seeding, validation, tests
├── docs/       Guides and release notes
└── .github/    CI workflows
```

Proti is a pnpm workspace containing two applications (`web` and `studio`), not a `packages/`-based monorepo.

## Requirements

- Node.js **24.19.0** and pnpm **10.34.1** (the validated CI versions).
- A separate Sanity project and writable dataset for each independent implementation.
- A Sanity API write token for seeding; a read token for draft preview; a webhook secret for production revalidation.
- Playwright Chromium installed before generating screenshots.

Keep local Node/pnpm versions aligned with CI when updating the lockfile.

## Important: source repository versus a new project

**Maintaining the original `proti-demo` repository:** do **not** run `proti:init`. Its Git history must be preserved. Mark each trusted maintained checkout once with:

```bash
git config --local proti.sourceRepository true
```

This setting is stored only in `.git/config`, is **not** inherited by clones, and makes `proti:init` refuse to modify the maintained source checkout. `pnpm proti:check` recognizes that its original `proti-demo` remote is intentional.

**Creating an independent website:** clone the starter into a **separate directory**, ensure the clone is clean, and explicitly initialize it:

```bash
git clone https://github.com/jchaiet/proti-demo.git my-proti-site
cd my-proti-site
pnpm proti:init --new-project
```

The initializer checks that this is an unmodified starter clone with its expected remote, then asks you to type **`RESET GIT HISTORY`**. This intentionally detaches the **new clone** from the original history, preserves the previous `.git` directory as a backup **next to** the new project, and creates an independent Git repository with no remote. It never silently rewrites an established repository. Do **not** use this flag in the maintained starter.

After initialization, set a new Git remote for the independent implementation and commit/push through your normal workflow. See [Project Initialization](docs/PROJECT_INITIALIZATION.md) for the full rules and recovery guidance.

## Initialize and run a new implementation

1. Create your own Sanity project and dataset. Run `pnpm proti:init --new-project` as above and supply the project ID, URLs, Site information, locales, and production hostname. First-time initialization automatically includes **`localhost`** in Site domains for development and CI. The canonical domain should be your production hostname when known.
2. Install dependencies and add server-only values to the generated `web/.env.local`:

   ```bash
   pnpm install --frozen-lockfile
   ```

   ```dotenv
   SANITY_API_READ_TOKEN=
   SANITY_API_WRITE_TOKEN=
   SANITY_REVALIDATE_SECRET=
   ```

3. Seed only a Site, or seed a Site with the minimal published homepage/navigation structure:

   ```bash
   pnpm proti:seed
   # or, if you need a working homepage for smoke/visual tests:
   pnpm proti:seed --starter-content
   ```

   Seeding reuses existing matching content and does not overwrite authored documents. **Publish** the Site and homepage as needed. Site Routing must include `localhost` and your production hostname.

4. Verify configuration and start the apps in separate terminals:

   ```bash
   pnpm proti:check
   pnpm dev:studio
   # separate terminal:
   pnpm dev:web
   ```

   Local defaults are Studio **http://localhost:3333** and Web **http://localhost:3000**. Proti matches Site **hostnames**, not arbitrary IP aliases: `127.0.0.1` does not match `localhost`.

5. Initialize **site-specific** Chromium desktop/mobile screenshots after the homepage exists:

   ```bash
   pnpm --dir web exec playwright install chromium
   pnpm proti:visual:init
   ```

   This builds the Web app and launches a production Next.js server for baseline capture. Port 3000 must be free; you can set `PROTI_VISUAL_PORT` for another available port. Review and commit the generated `web/e2e/__screenshots__/` PNGs. An intentional recapture requires `pnpm proti:visual:init --force`.

6. Deploy Studio and Web separately. After Vercel provides the final HTTPS Web hostname, run:

   ```bash
   pnpm proti:configure:production --url=https://your-site.vercel.app
   ```

   Commit the updated **non-secret** `studio/.env.production` and `proti.config.json`, redeploy **Studio**, and configure the Sanity publish webhook to reach the deployed Web `/api/revalidate` endpoint. See [Deployment](docs/DEPLOYMENT.md).

> `proti:init` does **not** create a Sanity project, tokens, GitHub repository, Vercel project, or webhook. Those provider-specific steps remain manual.

## Root commands

| Command                                           | Purpose                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm dev:web` / `pnpm dev:studio`                | Local applications                                                                         |
| `pnpm build:web` / `pnpm build:studio`            | Production builds                                                                          |
| `pnpm proti:init --new-project`                   | One-time explicit initialization in a clean starter clone                                  |
| `pnpm proti:init`                                 | Safe rerun in an already initialized independent project; refused in the maintained source |
| `pnpm proti:seed [--starter-content]`             | Idempotent Sanity Site/content seed                                                        |
| `pnpm proti:check`                                | Read-only local, Git, environment, and published Site validation                           |
| `pnpm proti:visual:init [--force]`                | Create site-specific desktop/mobile screenshot baselines                                   |
| `pnpm proti:configure:production --url=https://…` | Set production Presentation URL after Web deployment                                       |
| `pnpm test:proti`                                 | All initialization, seed, check, and acceptance tests                                      |
| `pnpm test:proti:integration`                     | Disposable fresh-project acceptance test                                                   |

## Validation and CI

Run from the repository root:

```bash
pnpm test:proti
pnpm proti:check
pnpm --dir web test:run
pnpm --dir studio test
pnpm --dir web exec next typegen
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
pnpm --dir web build
pnpm --dir studio build
```

From `web/`, Playwright offers `pnpm test:e2e:smoke`, `pnpm test:e2e:visual`, and `pnpm test:e2e`. The config starts a **production** Next.js server by default, checks readiness at `/api/health`, and navigates actual CMS pages at `http://localhost:3000`. The Site's **published** Routing domains must include `localhost`. Existing screenshot baselines are compared, not regenerated, in CI.

GitHub Actions checks Studio, Web, Playwright smoke (Chromium/Firefox desktop and mobile-width coverage), and Playwright visual (Chromium desktop/mobile). CI requires a matching Sanity project/dataset and published Site/homepage. See [Testing](docs/TESTING.md) and [CI Branch Protection](docs/CI_BRANCH_PROTECTION.md).

## Locales and content

Proti uses lowercase language-region locale codes (`en-us`, `es-us`, `fr-ca`). The default locale is **unprefixed**; secondary locales use a prefix:

```text
/products/widget
/es-us/products/widget
```

Exact translations are offered when present; absent translations are not silently redirected to another locale's homepage. Site content and its canonical production hostname are configured in the Sanity Site document.

## Mino UI dependency

Web consumes a versioned local Mino UI tarball (currently `web/mino-ui-0.0.3.tgz`). Mino is independently versioned. Never replace committed tarball bytes without a new version/filename; update `web/package.json`, `pnpm-lock.yaml`, and the tarball together. Verify:

```bash
pnpm install --no-frozen-lockfile
pnpm install --frozen-lockfile
```

## Documentation

- [Getting Started](docs/GETTING_STARTED.md) · [Project Initialization](docs/PROJECT_INITIALIZATION.md) · [Configuration](docs/CONFIGURATION.md) · [Deployment](docs/DEPLOYMENT.md)
- [Architecture](docs/ARCHITECTURE.md) · [Content Model](docs/CONTENT_MODEL.md) · [Components](docs/COMPONENTS.md) · [Editor Guide](docs/EDITOR_GUIDE.md) · [Translations](docs/TRANSLATIONS.md)
- [Testing](docs/TESTING.md) · [Visual CI](docs/VISUAL_CI.md) · [Initializer Tests](docs/INITIALIZER_TESTS.md) · [Setup Check](docs/PROTI_CHECK.md) · [CI Branch Protection](docs/CI_BRANCH_PROTECTION.md)
- [SEO/GEO](docs/SEO_GEO.md) · [Release Checklist](docs/RELEASE_CHECKLIST.md) · [v0.4.0 Release Notes](docs/releases/v0.4.0.md) · [Changelog](CHANGELOG.md)

**Release status:** v0.4.0 is the **release target**, not a claim that its Git tag or GitHub release has already been published. Confirm root/Web/Studio versions and a green release PR before tagging.
