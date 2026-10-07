# Proti Project Initialization

Proti v0.2 introduces a repository-level setup workflow for creating a new implementation from the starter.

## Commands

```bash
pnpm proti:init
pnpm proti:seed
```

## Initialize

After `pnpm install`, run:

```bash
pnpm proti:init
```

The initializer prompts for the project name, package slug, Sanity project/dataset, Studio and preview URLs, initial Site name/key, domains, default locale, and supported locales.

Proti locale codes use language-region format, for example:

```text
en-us
es-us
fr-ca
```

It writes:

```text
proti.config.json
web/.env.local
studio/.env.local
```

and updates the package names in the root, Web, and Studio `package.json` files.

Existing Sanity token values in `web/.env.local` are preserved when the initializer is rerun.

## Add local secrets

The initializer does not ask you to paste secrets into an interactive prompt. Add the required values to `web/.env.local`:

```text
SANITY_API_READ_TOKEN=
SANITY_API_WRITE_TOKEN=
SANITY_REVALIDATE_SECRET=
```

`SANITY_API_READ_TOKEN` is required for Draft Mode / Visual Editing. `SANITY_API_WRITE_TOKEN` is required only for the optional Site seeding command.

## Seed the initial Site

Run:

```bash
pnpm proti:seed
```

The seed reads `proti.config.json` and creates `site-<site-key>` in Sanity. It is non-destructive: if that Site already exists, the command exits without modifying it.

## Studio environment

`studio/sanity.config.ts` should use environment variables rather than a starter-specific hard-coded project ID:

```text
SANITY_STUDIO_PROJECT_ID
SANITY_STUDIO_DATASET
SANITY_STUDIO_TITLE
SANITY_STUDIO_PREVIEW_URL
```

Sanity requires variables exposed to the bundled Studio to use the `SANITY_STUDIO_` prefix.

## GitHub Actions

Once Studio becomes environment-driven, add this to the `studio` job in `.github/workflows/ci.yml`:

```yaml
env:
  SANITY_STUDIO_PROJECT_ID: ${{ secrets.NEXT_SANITY_PROJECT_ID }}
  SANITY_STUDIO_DATASET: ${{ vars.NEXT_SANITY_DATASET || 'production' }}
  SANITY_STUDIO_TITLE: Proti Studio
  SANITY_STUDIO_PREVIEW_URL: http://localhost:3000
```

This reuses the project ID and dataset already configured for the Web CI job.

## Vercel

The initializer configures local files only. Vercel environment variables remain separate and must continue to be configured on the Vercel project.

## Not automated yet

This first v0.2 initializer does not yet create a Sanity project, configure GitHub/Vercel secrets, deploy Studio/Web, or create homepage/navigation content. Those are later v0.2 candidates after this local workflow is proven stable.
