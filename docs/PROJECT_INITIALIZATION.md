# Proti project initialization (v0.4.0)

Proti initializes a new **independent** website from a starter clone without hardcoding another project's Sanity IDs, keeping inherited Git history, or reusing demo screenshot baselines. This document describes the shipped scripts, not a hypothetical generator.

## Safety: two different repository roles

| Repository                                          | Correct action                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Maintained `proti-demo` source checkout             | **Never run** `proti:init`; run `git config --local proti.sourceRepository true` once in that checkout             |
| Clean, newly cloned starter for a different project | `pnpm proti:init --new-project`, followed by typed `RESET GIT HISTORY` confirmation                                |
| Already initialized independent project             | `pnpm proti:init` safely reuses existing configuration, Git commits, remote, and screenshots                       |
| Other Git repository/custom remote                  | Ordinary init preserves history; `--new-project` is refused unless the clean clone meets starter-origin safeguards |

The local `proti.sourceRepository=true` marker and `proti.initialized=true` initializer marker live in **`.git/config`**; these are **not committed or inherited by `git clone`**. The maintained-source marker stops either initializer invocation **before** files are edited. Do not remove the maintained source's legitimate `proti-demo` origin to silence `proti:check`.

`--new-project` refuses modified/untracked files, unexpected remotes/push URLs, and worktrees/submodules/symlinked `.git` metadata. When explicitly authorized, the initializer moves the clone's old `.git` directory to a backup in the **parent directory** and creates a new independent `main` with no remotes. Do not run it in your existing source or production checkout.

## Recommended new-project sequence

```bash
git clone https://github.com/jchaiet/proti-demo.git my-proti-site
cd my-proti-site
pnpm proti:init --new-project
# Type RESET GIT HISTORY when asked.
pnpm install --frozen-lockfile
```

Run initialization before editing the clone. The initializer uses built-in Node tooling and does not require prior content seeding. Provide prompts for:

- Project display name, normalized package/project slug.
- Sanity project ID and dataset; local Studio URL used by Web.
- **Development** Web URL for Presentation (usually `http://localhost:3000`).
- Optional **production** Web HTTPS URL for Presentation (may be supplied later).
- Site display name/key, allowed **hostnames**, and canonical hostname.
- Default and supported lowercase language-region locales (`en-us`, `es-us`, `fr-ca`, etc.).

**First initialization automatically adds `localhost`** to the allowed Site domains, even when a production domain was supplied. An established project may intentionally change its domain list later; repeat init does not silently restore a removed domain. `canonicalDomain` must be one of the configured hostnames (no scheme or port). Prefer the eventual production hostname as canonical rather than localhost.

## Generated/updated files

| File                                   | Contents                                                                                   | Git policy                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `proti.config.json`                    | Project identity, Sanity URLs, Site domains/canonical/locales                              | Review and commit; contains no API tokens           |
| Root, `web/`, `studio/` `package.json` | Independent package names                                                                  | Commit                                              |
| `web/.env.local`                       | Web Sanity IDs/Studio URL, server-only token placeholders                                  | **Ignore**; fill in tokens locally                  |
| `studio/.env.local`                    | Studio project/dataset/title and optional Studio App ID                                    | **Ignore**; keep secrets/local overrides out of Git |
| `studio/.env.development`              | `SANITY_STUDIO_PREVIEW_URL=http://localhost:3000` (or configured dev origin)               | Commit only public URL                              |
| `studio/.env.production`               | `SANITY_STUDIO_PREVIEW_URL=https://…` once configured                                      | Commit only public URL                              |
| `web/e2e/__screenshots__/`             | Inherited demo PNGs removed on first independent Git init; never removed on ordinary rerun | Generate site-specific screenshots, then commit     |

Avoid `SANITY_STUDIO_PREVIEW_URL` in `studio/.env.local`; it may override mode-specific files and trigger a `proti:check` warning. Ensure `.gitignore` allows the two public Studio mode files and continues to ignore `.env.local` and `web/e2e/.env.e2e`.

Example project config (illustrative placeholders):

```json
{
  "version": 1,
  "projectName": "Acme Health",
  "packageName": "acme-health",
  "sanity": {
    "projectId": "abc123",
    "dataset": "production",
    "studioUrl": "http://localhost:3333",
    "previewUrl": "http://localhost:3000",
    "productionPreviewUrl": "https://acme-health.vercel.app"
  },
  "site": {
    "name": "Acme Health",
    "key": "acme-health",
    "domains": ["acme-health.vercel.app", "localhost"],
    "canonicalDomain": "acme-health.vercel.app",
    "defaultLocale": "en-us",
    "locales": [
      { "code": "en-us", "label": "English (US)" },
      { "code": "es-us", "label": "Spanish (US)" }
    ]
  }
}
```

## Add secrets and seed content

Create your own Sanity project/dataset/tokens through Sanity; initialization does **not** provision them. Set local server-only credentials in `web/.env.local`:

```dotenv
SANITY_API_READ_TOKEN=
SANITY_API_WRITE_TOKEN=
SANITY_REVALIDATE_SECRET=
```

Use a write token with document creation permissions for the seed. Seed one of two ways:

```bash
pnpm proti:seed                     # Site only
pnpm proti:seed --starter-content  # Site + default-locale Home/Header/Footer/Navigation
```

The seed uses `createIfNotExists` and deterministic IDs where appropriate. It does not overwrite an existing Site/homepage/navigation. A missing canonical-domain field on an existing Site may be backfilled; an authored canonical domain is not replaced. Only the default locale gets starter content, not demo Blogs/Authors/Taxonomy or translations. Review the published **Site → Routing** values and **publish** the Site/content before verifying live pages.

## Validate the result

```bash
pnpm proti:check
```

This read-only check covers independent Git repository/remote, mode-specific Studio URLs and tracking, Web and Studio IDs, package identity, read/write token presence, Sanity connectivity, Site domains/canonical/locales, and desktop/mobile visual baselines. Missing production URL or screenshots may generate **warnings** until configured; failed authentication, missing Site, and material mismatches are **errors**. See [Setup Check](PROTI_CHECK.md).

## Generate site-specific visual baselines

After a published homepage is available under `http://localhost:3000`, install Chromium and run:

```bash
pnpm --dir web exec playwright install chromium
pnpm proti:visual:init
```

`proti:visual:init` checks port availability, builds the Web app, starts the Next.js **production** server, generates Chromium desktop/mobile snapshots, and verifies both `home.png` files exist. An existing baseline is protected unless you specify `--force`. Set `PROTI_VISUAL_PORT=3001` (or another available port) if needed; the generated Playwright base/server URLs use that same port. Commit screenshots intentionally; CI must not update them.

## Configure production after Web deployment

```bash
pnpm proti:configure:production --url=https://acme-health.vercel.app
```

This updates `proti.config.json` (`sanity.productionPreviewUrl`) and **only** the preview variable in `studio/.env.production`. It preserves development URL and Studio App ID. The URL must be a public HTTPS origin with no path/query/credentials. The command warns if its hostname is absent from configured Site domains; manually align the **published Sanity Site document**, too. Commit the public configuration and **redeploy Studio** so Production Presentation points to the right Web host. No Web redeploy is required solely for this Studio URL change.

Then configure Vercel environment variables, Sanity CORS/Presentation permissions, and the signed publish webhook. See [Deployment](DEPLOYMENT.md).

## Git remote and repetition

After fresh init, create your own remote repository and configure `origin` for **that** project. Ordinary reruns (`pnpm proti:init`) preserve Git history/remotes and do **not** purge project-specific visual baselines. `--new-project` is **not** a reset command for an established project and should never be used to recover Git history.

If a Git push fails, inspect `git status`, `git remote -v`, `git log --oneline --decorate`, and `git rev-list --left-right --count origin/main...main`. Do not force-push the maintained starter or delete protected branches to repair an accidental initialization.

## Automated acceptance coverage

From the root:

```bash
pnpm test:proti:integration  # Disposable fresh-project acceptance test
pnpm test:proti              # All script tests including acceptance
```

The acceptance test creates a temporary project/repository and uses a mock Sanity HTTP API and simulated visual commands. It does not deploy or modify real Sanity data. It verifies end-to-end initialization, Site seeding, Git independence, env files, reinit preservation, production URL configuration, and baseline handling. The real standalone deployment was also tested separately; the automated test is a repeatable local regression, **not** a substitute for real provider integration.

## Not automated

The initializer does **not** create a Sanity project/API tokens, GitHub repo/ruleset/secrets, Vercel project/env settings, Sanity webhook/CORS configuration, or editorial translations. See [Getting Started](GETTING_STARTED.md), [Configuration](CONFIGURATION.md), and [Deployment](DEPLOYMENT.md).
