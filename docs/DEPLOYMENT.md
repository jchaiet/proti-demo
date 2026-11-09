# Deployment, Presentation, and revalidation (v0.4.0)

Proti Web and Sanity Studio are deployed **independently**. The v0.4.0 standalone-project rehearsal validated a fresh Sanity project/Studio, a Vercel Web deployment, published Site routing, draft Presentation, and signed publish/revalidation. This guide describes the reproducible process; provision provider accounts, IDs, permissions, and secrets yourself.

## 1. Prepare the independent project

Create an independent implementation with `pnpm proti:init --new-project` **in a fresh clone**, not the maintained Proti repository. Configure Sanity credentials and run `pnpm proti:seed --starter-content` for a minimal Home/navigation. Confirm the Site record and homepage are **published**. Site → Routing should include:

```text
localhost
<your-web-project>.vercel.app
```

Set `canonicalDomain` to your production hostname, not localhost. `localhost` is needed for local development and GitHub Actions; it is not the canonical public URL. Keep `proti.config.json` in sync with the published Site.

## 2. Deploy Web to Vercel

Create a Vercel project connected to your **independent GitHub repository**. Recommended settings for the validated setup:

| Setting          | Value                                                               |
| ---------------- | ------------------------------------------------------------------- |
| Framework preset | Next.js                                                             |
| Root Directory   | `web`                                                               |
| Node.js          | 24 (validated with 24.19.0)                                         |
| Install/build    | Use the pnpm workspace/lockfile and default Next.js build for `web` |
| Output Directory | Default (do not set a custom output path)                           |

The `web/` application consumes a local `mino-ui-<version>.tgz` dependency. Commit the tarball and a correct **root** `pnpm-lock.yaml` so cloud installs can resolve it.

Set production Web environment variables in **Vercel** (separate from GitHub Actions):

```text
NEXT_SANITY_PROJECT_ID
NEXT_SANITY_DATASET
NEXT_SANITY_STUDIO_URL
SANITY_API_READ_TOKEN
SANITY_API_WRITE_TOKEN
SANITY_REVALIDATE_SECRET
```

Use the matching independent project, dataset, and Studio deployment. Keep read/write tokens and webhook secret server-only. If you use Forms webhook forwarding, configure `FORM_WEBHOOK_DESTINATIONS` as a server-side production variable without wrapping the JSON in literal shell quotes; see [Multiple Form Webhooks](FORMS_WEBOOK_ROUTING.md). Redeploy Web when required for changed runtime/build settings.

Confirm `https://<web-host>/` loads its published Homepage. A 404 with a healthy Next server usually means a missing **published Site/domain/homepage**, not a broken Playwright server. `/api/health` confirms only server readiness.

## 3. Deploy Sanity Studio

Studio reads shared connection values (`SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`, optional `SANITY_STUDIO_APP_ID`) from its environment; `studio/sanity.cli.ts` does **not** hardcode the demo Sanity App ID. Ensure Studio builds/deploys to your project's own Studio application.

From `studio/`:

```bash
pnpm build
pnpm deploy
```

The Studio's Presentation URL is **mode-specific**:

```text
studio/.env.development → SANITY_STUDIO_PREVIEW_URL=http://localhost:3000
studio/.env.production  → SANITY_STUDIO_PREVIEW_URL=https://<web-host>
```

These two files should be tracked if they contain only public preview URLs. Keep IDs/App ID/local overrides in `studio/.env.local` (not committed). In GitHub's Studio job, **do not set** `SANITY_STUDIO_PREVIEW_URL=http://localhost:3000` as a global override; that can supersede the production file.

If the production Web hostname was unknown during init, configure it once deployed:

```bash
pnpm proti:configure:production --url=https://<web-host>
```

Run that command from the **repository root**, using the full public HTTPS origin (no path/query). It updates `studio/.env.production` and `proti.config.json`, not the dev URL or Sanity Site document. **Redeploy Studio** after this change. Confirm Studio Presentation opens the production Web URL rather than localhost. The URL change alone does not require redeploying Web.

Also configure allowed origins/CORS and any Presentation/preview access settings for the actual Web and Studio hosts in Sanity's project management UI.

## 4. Configure signed Sanity publish revalidation

Webhook URL:

```text
POST https://<web-host>/api/revalidate
```

The deployed Web uses `SANITY_REVALIDATE_SECRET` to validate the Sanity document webhook signature. Use the **same secret** in the webhook configuration. Do **not** paste an invented or incomplete filter/projection: use the canonical exports from:

```text
web/src/cms/revalidation/webhook.ts
```

Settings:

- Document webhook; **Include drafts: off** and **Include versions: off**.
- Use the exported filter and projection, including `before()` and `after()` snapshots.
- Target the actual deployed hostname; previous failures came from an incorrect endpoint URL even when the server/Studio were healthy.
- Check Sanity delivery logs and Vercel function logs if publishing does not invalidate content.

The Web's `/api/revalidate` route validates the signature, resolves affected dependencies (including route changes/deletes), and invalidates the relevant published paths. Publishing content in Sanity should update production without a redeploy.

## 5. Verify Presentation, publication, and privacy

1. Publish Site and homepage and verify the public Web URL.
2. In Sanity Studio, edit the homepage **without publishing**.
3. Open **Presentation** and confirm the draft appears there.
4. Open the public Web URL in a clean/incognito session; confirm the unpublished draft is **not visible**.
5. Publish the edit and confirm the public site updates through webhook revalidation without redeploying.
6. Revert/publish an innocuous change to test the inverse path.
7. Verify links, SEO canonical/hreflang, sitemap, robots, and at least one secondary locale if authored.

Do not use a local `pnpm start` server as proof the remote webhook reaches production: the local server ordinarily has no publicly reachable webhook endpoint.

## 6. GitHub Actions and visuals

The CI workflow has Studio, Web, Playwright smoke, and Playwright visual jobs. It uses **`http://localhost:3000`** in browser jobs, starts `pnpm exec next start -p 3000`, and checks readiness through `/api/health`. The published Site must include `localhost` or the homepage smoke tests fail with 404. See [Testing](TESTING.md).

Before the first PR in an independent project, create and commit its own screenshot baselines:

```bash
pnpm --dir web exec playwright install chromium
pnpm proti:visual:init
```

CI does **not** regenerate baselines. Published Sanity content changes can invalidate old snapshots; evaluate differences rather than increasing screenshot tolerance automatically.

## Release deployment checklist

- [ ] Root/Web/Studio versions, Mino tarball, and lockfile agree.
- [ ] GitHub `main`/PR history protected; `pnpm test:proti` and all required jobs green.
- [ ] `proti:check` has no unexpected errors; `localhost` and production host exist in the **published** Site domains.
- [ ] Studio project/dataset/App ID and production Presentation point to this implementation, not the demo or localhost.
- [ ] Web hosting contains the required credentials and **correct** webhook secret.
- [ ] Draft visible only through authenticated Presentation; publishing refreshes public content.
- [ ] All example/environment artifacts are reviewed for secret leakage.
- [ ] Production URLs, canonical/hreflang, and navigation are checked before release/tag.

See [Configuration](CONFIGURATION.md), [Editor Guide](EDITOR_GUIDE.md), and [Release Checklist](RELEASE_CHECKLIST.md).
