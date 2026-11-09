# Configuration and environments (v0.4.0)

Proti's configuration has distinct **project**, **Web**, **Studio shared**, **Studio mode-specific**, and **test/CI** layers. Avoid putting a variable in the wrong file: we previously saw Production Presentation point at localhost because a shared/CI preview URL overrode the production file.

## Project record: `proti.config.json`

Created by `pnpm proti:init --new-project` in an independent clean clone; the starter includes `proti.config.example.json`. The record stores names, Sanity IDs, Site key, locale list, allowed **hostnames**, canonical hostname, and Web/Studio preview URLs. It contains no API tokens and should be committed after review.

| Config path                           | Meaning                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `sanity.projectId` / `sanity.dataset` | Independent Content Lake connection                                             |
| `sanity.studioUrl`                    | Studio origin consumed by Web (`NEXT_SANITY_STUDIO_URL`)                        |
| `sanity.previewUrl`                   | **Development** Web origin for Presentation                                     |
| `sanity.productionPreviewUrl`         | **Production** HTTPS Web origin for Presentation                                |
| `site.domains`                        | Allowed hosts (for example `localhost`, `example.com`), **without** scheme/port |
| `site.canonicalDomain`                | Preferred production hostname; must occur in `site.domains`                     |
| `site.defaultLocale` / `site.locales` | Default unprefixed locale and supported language-region codes                   |

Initial `site.domains` automatically includes `localhost`. Keep `proti.config.json` aligned with the **published** Site → Routing document; editing local JSON alone does not update Sanity. In particular, a missing published `localhost` domain causes local Web/CI homepage 404s despite `/api/health` responding successfully.

## Web: `web/.env.local` (secret; ignored)

| Variable                   | Purpose                                 | Exposure               |
| -------------------------- | --------------------------------------- | ---------------------- |
| `NEXT_SANITY_PROJECT_ID`   | Web Content Lake project                | Public configuration   |
| `NEXT_SANITY_DATASET`      | Dataset                                 | Public configuration   |
| `NEXT_SANITY_STUDIO_URL`   | Actual Studio origin for visual editing | Public configuration   |
| `SANITY_API_READ_TOKEN`    | Draft Mode/private server reads         | **Server-only secret** |
| `SANITY_API_WRITE_TOKEN`   | Server-side writes (e.g., Poll, seed)   | **Server-only secret** |
| `SANITY_REVALIDATE_SECRET` | Verify signed Sanity webhook requests   | **Server-only secret** |

Keep API tokens and the webhook secret out of `NEXT_PUBLIC_*`, Git, and screenshots/logs. Production equivalents must be configured separately in **Vercel**; GitHub Actions secrets are not automatically copied there. Forms may require additional `FORM_WEBHOOK_DESTINATIONS` server-side configuration for webhook destinations; see [Multiple Form Webhooks](FORMS_WEBOOK_ROUTING.md).

## Studio shared values: `studio/.env.local` (ignored)

| Variable                   | Purpose                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `SANITY_STUDIO_PROJECT_ID` | Studio Sanity project (matches Web)                        |
| `SANITY_STUDIO_DATASET`    | Studio dataset (matches Web)                               |
| `SANITY_STUDIO_TITLE`      | Display title                                              |
| `SANITY_STUDIO_APP_ID`     | Optional deployment App ID; read by `studio/sanity.cli.ts` |

The CLI reads project/dataset/App ID from the environment instead of hardcoded demo IDs. Keep **`SANITY_STUDIO_PREVIEW_URL` out of `studio/.env.local`**: it belongs in one of the mode files below.

## Studio Presentation: mode-specific public URL files

These files contain **only non-secret URL configuration** and are intended to be tracked:

```dotenv
# studio/.env.development
SANITY_STUDIO_PREVIEW_URL=http://localhost:3000
```

```dotenv
# studio/.env.production
SANITY_STUDIO_PREVIEW_URL=https://your-site.vercel.app
```

`studio/sanity.config.ts` uses `SANITY_STUDIO_PREVIEW_URL` for Presentation. `studio/.env.production` is updated after Web deployment with:

```bash
pnpm proti:configure:production --url=https://your-site.vercel.app
```

This also updates `sanity.productionPreviewUrl` in `proti.config.json`, without changing the development URL or Studio App ID. **Redeploy Studio** after the production URL changes. Remove any hardcoded `SANITY_STUDIO_PREVIEW_URL=http://localhost:3000` from the **Studio CI job**; process env overrides can take precedence over mode files.

Suggested root `.gitignore` treatment, adjusted to your actual existing rules:

```gitignore
.env*
!.env.example
!e2e/.env.e2e.example
!studio/.env.development
!studio/.env.production
```

Verify tracking with:

```bash
git ls-files --error-unmatch studio/.env.development studio/.env.production
git ls-files web/.env.local studio/.env.local web/e2e/.env.e2e
```

The first command should list the two public mode files; the second should return nothing.

## Playwright and screenshot initialization

`web/playwright.config.ts` currently defaults to:

| Variable                        | Meaning/default                                                 |
| ------------------------------- | --------------------------------------------------------------- |
| `PLAYWRIGHT_BASE_URL`           | `http://localhost:3000`                                         |
| `PLAYWRIGHT_WEB_SERVER_COMMAND` | `pnpm exec next start -p <base-URL port>`                       |
| `PLAYWRIGHT_SKIP_WEBSERVER`     | `0`/unset: start production server; `1`: use an existing server |
| `E2E_HOME_PATH`                 | `/` for the seeded homepage                                     |
| `PLAYWRIGHT_INCLUDE_WEBKIT=1`   | Optional WebKit browser project (requires browser installation) |
| `PROTI_VISUAL_PORT`             | Port used only by `pnpm proti:visual:init` (default `3000`)     |

The server-readiness URL is `<baseURL>/api/health`, separate from the CMS-backed route assertions. `reuseExistingServer` is false: if the desired port is busy, stop that process rather than accidentally testing a different server. E2E route selections live in `web/e2e/.env.e2e` (ignored); copy its committed example file.

Typical GitHub Actions settings for **both** Playwright jobs:

```yaml
PLAYWRIGHT_BASE_URL: http://localhost:3000
PLAYWRIGHT_WEB_SERVER_COMMAND: pnpm exec next start -p 3000
PLAYWRIGHT_SKIP_WEBSERVER: "0"
E2E_HOME_PATH: /
```

The Site document must have a published `localhost` domain and published homepage. Screenshots are site-specific until a future deterministic fixture harness replaces CMS-dependent visual baselines.

## Git source/initialized markers

The maintained original Proti checkout should have the **local-only** setting:

```bash
git config --local proti.sourceRepository true
```

It prevents `proti:init` from modifying that checkout and allows `proti:check` to recognize its legitimate `proti-demo` remote. New clones **do not inherit** `.git/config`. Independent init writes its own `proti.initialized=true` Git setting. See [Project Initialization](PROJECT_INITIALIZATION.md).

## Secret and provider hygiene

- Commit project config and public Studio mode URLs, **never credentials**.
- Store production secrets in Vercel and/or provider-specific secret stores; configure GitHub Secrets/Variables separately for CI.
- Configure Sanity CORS and Presentation to allow the actual deployed Web/Studio origins.
- Ensure signed document webhook secret matches the deployed Web environment; avoid surrounding values with shell quote characters when entering provider UI fields.
- Review environment files before committing; rotate a token if accidentally disclosed.

See [Deployment](DEPLOYMENT.md), [Setup Check](PROTI_CHECK.md), and [Release Checklist](RELEASE_CHECKLIST.md).
