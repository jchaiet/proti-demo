# Getting started with Proti (v0.4.0)

This guide is for **creating a separate website from the Proti starter**. If you maintain the original `proti-demo` repository, **do not run the initializer there**. See [Project Initialization](PROJECT_INITIALIZATION.md) for the Git safeguards and full setup contract.

## Prerequisites

- Node **24.19.0**, pnpm **10.34.1**, Git, and the versioned Mino UI tarball included with Web.
- Your own Sanity project, dataset (normally `production`), and a write-capable API token for seeding.
- A public HTTPS Web hostname and Sanity Studio deployment when you reach production.

## 1. Create an independent clone

```bash
git clone https://github.com/jchaiet/proti-demo.git my-proti-site
cd my-proti-site
pnpm proti:init --new-project
```

Run this **before modifying files**. The operation requires a clean clone with the expected starter remote and the exact typed confirmation **`RESET GIT HISTORY`**. The old `.git` is backed up next to the project; the new project has its own empty Git history and no remote. Set up a new repository/remote for your client or website; do not repoint the maintained source repository.

The initializer requests project/package identity, Sanity project/dataset, Web↔Studio URLs, Site identity, Site domains, canonical hostname, and locales. **`localhost` is included automatically** on first initialization for local Web and CI routing.

## 2. Configure local environments

```bash
pnpm install --frozen-lockfile
```

The initializer writes `proti.config.json`, `web/.env.local`, `studio/.env.local`, `studio/.env.development`, and `studio/.env.production`, and updates package names. Add required secrets to `web/.env.local` only:

```dotenv
SANITY_API_READ_TOKEN=
SANITY_API_WRITE_TOKEN=
SANITY_REVALIDATE_SECRET=
```

- `studio/.env.local`: shared Studio project/dataset/title and optional Studio App ID.
- `studio/.env.development`: local Presentation URL (usually `http://localhost:3000`).
- `studio/.env.production`: public HTTPS Web Presentation URL; can be completed after deployment.
- The two mode-specific Studio files contain **public URLs only** and should be committed. Keep `.env.local` and credentials ignored.

See [Configuration](CONFIGURATION.md) for all fields.

## 3. Seed the site and publish initial content

```bash
pnpm proti:seed                    # Site only
# OR
pnpm proti:seed --starter-content # Site + minimal Home/Header/Footer/Navigation
```

The seed is idempotent and does not overwrite existing content. Use the starter-content option if you want a published homepage for Playwright smoke and screenshot tests. In Sanity Studio, confirm **Site → Routing** includes both `localhost` and your future public hostname; set the production hostname as canonical. Publish the Site and required pages.

## 4. Validate and develop

```bash
pnpm proti:check
```

In separate terminals:

```bash
pnpm dev:studio   # http://localhost:3333
pnpm dev:web      # http://localhost:3000
```

Proti resolves its Site by request hostname. `http://127.0.0.1:3000` is **not** an interchangeable alias for `http://localhost:3000` unless Site Routing explicitly recognizes both.

## 5. Generate the first project-owned visual baselines

After your homepage is published and port 3000 is available:

```bash
pnpm --dir web exec playwright install chromium
pnpm proti:visual:init
```

This builds Web, starts a production server, and saves desktop/mobile screenshots to `web/e2e/__screenshots__/`. Review and commit them before opening a PR; CI will **compare** them. To deliberately regenerate existing baselines, use `pnpm proti:visual:init --force` only after reviewing the expected differences. Screenshots currently reflect **published CMS content**; publishing different text can cause expected visual failures. Stable fixture-driven visuals are planned for v0.5.0.

## 6. Deploy and configure Production Presentation

Deploy Web to Vercel with **Root Directory `web`** and configure its Sanity credentials and webhook secret. Deploy Studio against the same Sanity project/dataset with its own deployment configuration. Once your production URL is known:

```bash
pnpm proti:configure:production --url=https://your-site.vercel.app
```

Commit the updated non-secret Studio production URL file and project config, **redeploy Studio**, add the public Web hostname to the **published** Site Routing domains, and configure Sanity's signed document webhook at `https://your-site.vercel.app/api/revalidate`. See [Deployment](DEPLOYMENT.md) for the complete sequence, required permissions, and checks.

## First editorial pass

1. Confirm Site locale, canonical domain, routing, and SEO defaults; publish Site.
2. Create/publish the default-locale homepage, Header/Footer and Navigation Set (or use starter content).
3. Add content blocks and accessibility/SEO metadata; verify the public route.
4. Create exact translated Pages as needed, preserving logical paths and translated parents.
5. Confirm the language selector exposes only published exact equivalents.
6. Edit a draft in Presentation, ensure public visitors cannot see it, publish, and verify the public page updates through revalidation.

See [Editor Guide](EDITOR_GUIDE.md) and [Translations](TRANSLATIONS.md).

## Common setup failures

| Symptom                                           | Check                                                                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `proti:init` refuses in original source           | Correct: **never initialize** the maintained repo; mark its checkout with `git config --local proti.sourceRepository true` |
| New clone refuses normal initialization           | Use `pnpm proti:init --new-project` in a **clean** fresh clone, with explicit confirmation                                 |
| Homepage/Playwright receives 404                  | Publish Site/Home and include `localhost` in **published Site Routing** and `proti.config.json`                            |
| Studio Presentation opens localhost in production | Set `studio/.env.production` with `proti:configure:production` and redeploy Studio; remove CI hardcoded preview overrides  |
| `proti:check` warns about mode env tracking       | Allow `studio/.env.development` and `studio/.env.production` in `.gitignore`                                               |
| Studio fails to connect                           | Correct Studio project ID, dataset, app ID (when used), and origin/CORS settings                                           |
| Visual CI fails after content edits               | Inspect actual/diff screenshots; update only intentionally changed committed baselines                                     |
| Published production content is stale             | Check webhook URL, signature secret, filter/projection, and deployed Web logs                                              |

For commands and test coverage, see [Testing](TESTING.md) and [Project Initialization](PROJECT_INITIALIZATION.md).
