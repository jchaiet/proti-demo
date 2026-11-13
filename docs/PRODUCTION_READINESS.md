# Proti production integration readiness (v0.6.0 Stage 1)

Run `pnpm proti:check` from the repository root after configuring your project. This checks the _shape_ of local `web/.env.local` and exported runtime variables; it does not read values from a hosting provider's dashboard, verify webhook delivery, or mutate Sanity. Existing Sanity Site connectivity checks remain part of `proti:check`.

## How to interpret results

- `✓`: A setting is absent by design (optional integration) or has a structurally valid configuration.
- `!`: Something warrants operator review. The checker returns success if only warnings are present.
- `✗`: An explicitly configured integration is incomplete or invalid. `proti:check` returns a nonzero exit status.

Optional Forms and Polls are **not required** for a new Proti site. To validate the _production_ configuration locally, export `NODE_ENV=production` (or `VERCEL_ENV=production`) for the checker and provide the relevant non-secret/secret environment variables from a secure source. Do not paste real secrets into tickets or CI logs. `PROTI_VISUAL_FIXTURES=1` is intentionally rejected in production mode.

## Forms

Choose either the default destination (`FORM_WEBHOOK_URL` and `FORM_WEBHOOK_SECRET`) or a JSON mapping in `FORM_WEBHOOK_DESTINATIONS`. Named mappings require a lower-case key and an object with `url` (HTTPS) and nonempty `secret`. Optional `siteIds` restrict destination usage. Do not add extra literal quotes around JSON when storing it in Vercel environment variables.

If Forms are configured, set exact comma-separated `FORM_ALLOWED_ORIGINS` (e.g., `https://www.example.com`), or use a trusted Vercel platform hostname. The local development fallback is not valid in production. The validator rejects malformed origins and credential-bearing URLs; it deliberately never prints the URL or signing secret.

**Runtime protection:** The current Forms endpoint validates JSON and field values, checks request origins, applies a honeypot, and forwards to configured webhooks. It does **not** perform application-level rate limiting. Proti does **not require Redis/Upstash** to submit forms. Use Vercel or other hosting-edge controls for IP-based abuse limits where appropriate; verify policies separately, and don't claim protection exists until configured in your hosting account. CSS-hidden forms or honeypots alone do not prevent automated requests.

## Polls

When polls are enabled, `POLL_VISITOR_SECRET` must contain at least 32 characters and `SANITY_API_WRITE_TOKEN` must be configured with the required permissions. Production voting requires exact `POLL_ALLOWED_ORIGINS` (e.g., `https://www.example.com`); unlike Forms, the reviewed Poll origin helper does **not** automatically derive a Vercel hostname.

**Runtime protection:** Poll voting uses a signed HttpOnly visitor cookie and Sanity mutations. That prevents ordinary repeat votes in the same browser while the cookie is present, but does not guarantee one vote per person across browsers, cleared cookies, or automated clients. Proti does **not require Redis/Upstash** for Polls. Avoid describing cookie protection as exact-once voting or app-level rate limiting. Configure edge protections separately if abuse is a concern.

## Old rate-limit helper files and environment variables

Some earlier source trees retain unused Redis-related helpers in `web/src/lib/forms/rate-limit.ts` and `web/src/lib/polls/rate-limit.ts`. The currently reviewed Forms and Polls routes do not import or call them. Keeping these files alone does not activate Redis, but they can be removed separately after checking for imports.

The checker **never requires Redis**. If legacy `FORM_*` or `POLL_*` Redis/rate-limit environment variables are present, it emits a warning recommending removal of unused credentials. Those values are never printed. This is informational, not a deployment blocker, and does not prove an edge limiter is active.

## Revalidation and visual fixtures

`SANITY_REVALIDATE_SECRET` remains checked by the existing setup checker. Treat a missing secret as an operational warning; no live revalidation is triggered.

Fixture routes are only intended for local/CI visual regression builds. Ordinary production deployments must not set `PROTI_VISUAL_FIXTURES=1`. The runtime route guard already exists from v0.5.0; the new readiness checker flags accidental production enablement as a separate defense in depth.

## Dependency audit

Re-run the dependency audit when changing dependency versions or before release:

```bash
pnpm audit --json > proti-v0.6-audit.json
pnpm audit --prod --json > proti-v0.6-audit-prod.json
```

`pnpm audit` may exit nonzero when vulnerabilities exist; review the JSON files rather than treating the nonzero exit as a command error. Compare production versus development-only advisories before deciding on upgrades. Do not commit raw audit files or indiscriminately run `pnpm audit --fix` until compatibility is reviewed.

## After installing this cleanup

```bash
node --test scripts/proti-integration-readiness.test.mjs
pnpm test:proti
pnpm proti:check
```

No production API, schema, or fixture screenshot changes are included. The existing setup checker continues to validate Forms/Polls signing, origin configuration, and fixture route gating.
