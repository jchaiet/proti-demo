# Getting started with Proti (v0.6.0 developer workflow)

Proti is a Next.js Web + Sanity Studio starter powered by Mino UI. **Web and Studio are separate apps in one pnpm workspace**. Follow the path that matches your task:

- **Maintaining the existing Proti repository?** Do not run `proti:init` or `proti:seed` just to start development. Install dependencies, check the existing environment, and use the developer commands below.
- **Creating a site for a new client?** Start from a _fresh, clean, independent clone_ and run `proti:init --new-project`. This intentionally resets that clone's Git history; never run it in the maintained source checkout.

For implementation details see [Architecture](ARCHITECTURE.md), [Components / Mino UI](COMPONENTS.md), [Developer Commands](DEVELOPER_COMMANDS.md), and [Testing](TESTING.md).

## Prerequisites

- Node **24.19.0** and pnpm **10.34.1** (the versions used by the starter's validated setup), plus Git.
- The versioned Mino UI package archive referenced by `web/package.json` (`file:mino-ui-0.0.3.tgz` in the supplied Web source); it must be present in `web/` for install and CI. Do not replace it with an unrelated published package.
- An existing Sanity project and dataset, or permission to create them in Sanity. Proti does **not** provision Sanity accounts, projects, or API tokens.
- Chromium for Playwright and a compatible Chrome/Chromium executable for Lighthouse when running the browser and performance suites.

## Path A — Work on an existing configured Proti site

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm proti:env:check
pnpm proti:check
pnpm verify:quick
```

`proti:env:check` is **offline** and reads local `.env` files in its default development mode. `proti:check` additionally checks live Sanity configuration and connectivity. `verify:quick` runs environment validation, root/Web/Studio tests, linting, and type checking without starting a browser.

Start the apps in separate terminals:

```bash
pnpm dev:studio # normally http://localhost:3333
pnpm dev:web    # normally http://localhost:3000
```

The published Site's Routing `domains` must include `localhost` for `http://localhost:3000` to resolve. `127.0.0.1` is **not equivalent** unless separately configured. Do not set `PROTI_VISUAL_FIXTURES=1` in a normal public deployment.

## Path B — Create a new independent site

### 1. Initialize the new checkout

```bash
git clone https://github.com/jchaiet/proti-demo.git my-proti-site
cd my-proti-site
pnpm proti:init --new-project
```

Run initialization **before other edits**. It requires a clean clone with the expected starter remote and the exact typed confirmation `RESET GIT HISTORY`. It backs up the original `.git` beside the clone and creates a new independent repository history without a remote. Set your own project remote afterward. Never use this command to reset the maintained `proti-demo` repository.

The initializer collects project identity, Sanity project/dataset, Studio/Web URLs, Site domains/canonical domain, and locale configuration. It writes `proti.config.json`, Web/Studio local environment files, mode-specific Studio Presentation URLs, and project-specific package names. It also removes inherited demo visual screenshots on first initialization.

### 2. Install and add secrets

```bash
pnpm install --frozen-lockfile
```

Set the **server-side** values needed by your chosen features in `web/.env.local` (never commit credentials):

```dotenv
SANITY_API_READ_TOKEN=   # Draft Mode / private reads
SANITY_API_WRITE_TOKEN=  # Seeding, Polls, other writes
SANITY_REVALIDATE_SECRET= # Signed publish webhook
```

Web also needs `NEXT_SANITY_PROJECT_ID`, `NEXT_SANITY_DATASET`, and `NEXT_SANITY_STUDIO_URL`, which the initializer configures. Studio uses `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`, and optional title/App ID from `studio/.env.local`. Studio Presentation uses the **tracked non-secret** `studio/.env.development` and `studio/.env.production` files; do not move its preview URL into `.env.local`.

For exact variable names, precedence, and troubleshooting see [Configuration](CONFIGURATION.md) and [Environment Preflight](ENVIRONMENT_PREFLIGHT.md).

### 3. Seed and publish the starting Site

```bash
pnpm proti:seed                    # Site only
# or
pnpm proti:seed --starter-content  # Site + minimal Home/Header/Footer/Navigation
```

Seeding is idempotent and does not replace existing authored content. Confirm in Studio that the Site, homepage and any navigation needed for your first route are **published**; Site → Routing should include `localhost` and your intended production hostname, with the public hostname selected as canonical.

### 4. Validate and run locally

```bash
pnpm proti:env:check
pnpm proti:check
pnpm verify:quick
pnpm dev:studio
# in a second terminal: pnpm dev:web
```

If you need a failed check explained, use [Environment Preflight](ENVIRONMENT_PREFLIGHT.md) or [Project Check](PROTI_CHECK.md). **Do not** run `--mode=ci` locally expecting it to read `web/.env.local`: CI mode requires exported Web environment variables.

### 5. Generate project-owned fixture screenshots

```bash
pnpm --dir web exec playwright install chromium
pnpm proti:visual:init
```

This builds Web with the guarded **version-controlled, CMS-independent** fixture routes, captures Chromium desktop/mobile screenshots, and refuses to overwrite existing PNGs unless `--force` is explicitly passed. Review and commit the generated screenshots. The normal production build **must not** expose `/visual-fixtures/*` routes. See [Visual CI](VISUAL_CI.md).

## Day-to-day developer workflow

| Task                                                   | From repository root                                  |
| ------------------------------------------------------ | ----------------------------------------------------- |
| Discover available checks                              | `pnpm proti:commands`                                 |
| Local checks before a PR                               | `pnpm verify:quick`                                   |
| Component visuals, accessibility, Grid image stability | `pnpm verify:fixtures`                                |
| Lighthouse desktop/mobile budgets                      | `pnpm verify:performance`                             |
| Full developer regression                              | `pnpm verify:all`                                     |
| Preview any check without executing                    | `pnpm verify:all --dry-run`                           |
| Build apps with local environment preflight            | `pnpm build:web:checked`, `pnpm build:studio:checked` |

For an isolated onboarding regression (including a disposable Git reset test), use `pnpm test:proti:dx`. See [DX Regression](DX_REGRESSION.md) for the separate manual clean-install checklist.

`verify:all` performs the combined checks with **one fixture-enabled build**. These scripts neither deploy content nor update screenshots, and their fixture-enabled output **must never be deployed**. CI and Vercel have their own explicit build settings. See [Developer Commands](DEVELOPER_COMMANDS.md) and [Testing](TESTING.md).

## Deploy an independently initialized site

Deploy Web to Vercel with Root Directory **`web`** using a **normal** build (`PROTI_VISUAL_FIXTURES` unset or `0`), with server-side credentials configured on Vercel. Deploy Studio to the intended Sanity Studio application and point it at the same project/dataset.

After the public HTTPS Web URL is known:

```bash
pnpm proti:configure:production --url=https://your-site.vercel.app
```

Commit the updated public Studio production Presentation URL and project configuration; **redeploy Studio**. Add the Web hostname to the **published Site** domains and configure the signed Sanity document webhook at `https://your-site.vercel.app/api/revalidate`. Confirm both public pages and draft Presentation separately. Full instructions: [Deployment](DEPLOYMENT.md), [Production Readiness](PRODUCTION_READINESS.md).

## Extending a site

Start in [Components / Mino UI](COMPONENTS.md) for the actual Studio schema → GROQ → CMS type → mapper → `BlockRenderer` flow and a worked Accordion field example. New routes/templates involve the catch-all page and route/SEO resolvers; see [Architecture](ARCHITECTURE.md). Before merging, run `verify:quick`, followed by the fixture/other targeted suites appropriate to the change.

## Common setup failures

| Symptom                                              | First check                                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `proti:init` rejects the original source repository  | Expected safeguard. Use a **clean independent clone**, never reset the maintained checkout.          |
| `/` returns 404 on a healthy local Web server        | Check **published** Site/homepage and `localhost` in Site Routing domains.                           |
| Preflight misses variables in `--mode=ci`            | That mode intentionally ignores local Web `.env` files. Use the default mode locally.                |
| Studio Presentation opens localhost after deployment | Update `studio/.env.production` via `proti:configure:production`, then redeploy Studio.              |
| Fixture route returns 404                            | Intentional in a normal build; build with `PROTI_VISUAL_FIXTURES=1` only for local/test use.         |
| Visual CI fails after an intentional styling change  | Inspect actual/diff artifacts and review only the affected snapshots before approving new baselines. |
| Production content stays stale after publishing      | Check webhook URL/signature, revalidation filter, and deployment logs.                               |

For editing content and translations, see [Editor Guide](EDITOR_GUIDE.md) and [Translations](TRANSLATIONS.md).
