# Proti v0.6.0 — Offline environment preflight (DX Batch 1)

`pnpm proti:env:check` checks **local configuration before building**. It is
read-only and offline: no network calls, filesystem writes, Git changes, or
Sanity mutations. It reports names of invalid/missing variables, **never secret
values**, and exits nonzero on errors. Optional integrations produce warnings
unless configured incorrectly in the existing `pnpm proti:check` readiness
checks.

## Commands (from repository root)

```bash
# Standard development project: Web, Studio, and cross-app consistency
pnpm proti:env:check

# Check one application (useful before building it)
pnpm proti:env:check --target=web --mode=development
pnpm proti:env:check --target=studio --mode=development

# Preflight followed by the relevant local production build
pnpm build:web:checked
pnpm build:studio:checked

# In GitHub Actions, with credentials/configuration already exported
pnpm proti:env:check --target=web --mode=ci

# Verify a real Web deployment environment before shipping it
pnpm proti:env:check --target=web --mode=production
```

CLI flags: `--target=all|web|studio` (default `all`) and
`--mode=development|production|ci` (default `development`; `local` is accepted as
an alias for `development`). `--help` displays usage.

### What it validates

| Layer              | Checks                                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web                | `NEXT_SANITY_PROJECT_ID`, `NEXT_SANITY_DATASET`, `NEXT_SANITY_STUDIO_URL` have usable values and format.                                                         |
| Studio             | `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`, `SANITY_STUDIO_PREVIEW_URL` present; development permits local HTTP, production requires public HTTPS.      |
| Project            | When `proti.config.json` is present, Web/Studio Sanity identifiers, dataset, Studio URL, and the current mode's Presentation URL match its Sanity settings.      |
| Cross-app          | When checking `all`, Web and Studio point to the same Sanity project and dataset.                                                                                |
| Secrets            | Warns when optional read/write/webhook secrets are absent; **rejects secret-looking `NEXT_PUBLIC_` exports**. Does not print values.                             |
| Deployment hygiene | Rejects `PROTI_VISUAL_FIXTURES=1` in `production` mode; permits CI fixtures with a warning. Prevents `studio/.env.local` from overriding Presentation mode URLs. |

This is **structural configuration validation**, not proof of an active Sanity
connection, correct token permissions, a published Site, or an operating webhook.
To validate those, run `pnpm proti:check` after initialization/seeding, and see
[Production Readiness](PRODUCTION_READINESS.md) for Forms/Polls.

### Source precedence and modes

- **development:** checks exported process variables first, then local Next/Sanity
  dotenv files (`.env.development.local`, `.env.local`, `.env.development`,
  `.env`, in descending precedence). The initializer creates local files.
- **production:** checks exported variables first, then equivalent
  `.env.production.local`, `.env.local`, `.env.production`, `.env` files. Use
  actual deployment variables when running this check before shipping.
- **ci:** checks only exported Web variables. For Studio, it also reads the
  tracked `studio/.env.production` (Presentation URL), never `.env.local`.
  This avoids accepting local credentials silently in CI.

On a new independent checkout, `proti.config.json` is required for local
(`development`) validation. Run `pnpm proti:init --new-project` in a **clean,
independent clone** first. Do **not** run that initializer in the maintained
original source repository. For CI/deployment, `proti.config.json` may not be
packaged with the app; its absence produces a warning and checks still validate
exported values.

### Running from a Web/Studio deployment

The CLI lives at the **repository root**. The production build commands are not
changed by this batch: `pnpm --dir web build` and `pnpm --dir studio build`
still work as before. This intentionally avoids requiring root scripts from a
Vercel project whose Root Directory is `web`. The optional `build:*:checked`
commands are for root-local development. CI can add an explicit preflight step
in a future workflow revision once its environment/working directory is confirmed.

### Troubleshooting

- `Missing NEXT_SANITY_PROJECT_ID`: initialize an independent site or set the
  Sanity Web project ID in `web/.env.local` (or exported deployment variables).
- `SANITY_STUDIO_PREVIEW_URL` invalid in production: replace localhost with a
  public HTTPS origin in `studio/.env.production`. Then redeploy Studio.
- `Studio environment` error: remove `SANITY_STUDIO_PREVIEW_URL` from
  `studio/.env.local` and use mode-specific files instead.
- `Sanity consistency` error: Web and Studio point at different project IDs or
  datasets. Check them against the intended `proti.config.json`.
- `Visual fixtures` error for a production deployment: unset
  `PROTI_VISUAL_FIXTURES` or set it to `0`; fixture routes must return 404 on
  normal public deployments.
- Warnings about API tokens: required only for the features named in the
  message. Do not weaken production feature checks; use `pnpm proti:check`.

## Tests

```bash
node --test scripts/proti-env-check.test.mjs
pnpm test:proti
```

The preflight unit tests use temporary directories and do not contact Sanity.
