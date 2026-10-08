# Proti Project Initialization

Proti v0.2 includes a repository-level setup workflow for creating a new implementation from the starter.

## Commands

```bash
pnpm proti:init
pnpm proti:seed
pnpm proti:seed --starter-content
pnpm proti:check
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

`SANITY_API_READ_TOKEN` is required for Draft Mode / Visual Editing. `SANITY_API_WRITE_TOKEN` is required for seeding and must have permission to create documents.

## Seed the initial Site

Run:

```bash
pnpm proti:seed
```

The default seed remains intentionally minimal. It creates only:

```text
Site
```

If the Site already exists, no changes are made.

## Optional starter content

Starter content is opt-in. To create a minimal usable default-locale structure, run:

```bash
pnpm proti:seed --starter-content
```

This ensures the Site exists and then creates, only when missing:

```text
<default locale>
├── Home
├── Default Header
├── Default Footer
└── Default Navigation
```

The starter content is intentionally empty/minimal. It does not create demo articles, authors, taxonomy, marketing copy, or translated duplicates.

The command is non-destructive:

- existing documents are not replaced
- an existing homepage for the Site + default locale is reused
- matching `default-header`, `default-footer`, and `default` navigation documents are reused
- new documents use deterministic IDs and `createIfNotExists`
- rerunning the command is safe
- only the Site default locale receives starter content

You can also add starter content later. For example, this is valid:

```bash
pnpm proti:seed
# ...later...
pnpm proti:seed --starter-content
```

## Verify setup

Run:

```bash
pnpm proti:check
```

The check is read-only and verifies local configuration, environment alignment, Sanity connectivity, and the Site document.

Because starter content is optional, missing starter documents do not make `proti:check` fail.

## Studio environment

`studio/sanity.config.ts` uses:

```text
SANITY_STUDIO_PROJECT_ID
SANITY_STUDIO_DATASET
SANITY_STUDIO_TITLE
SANITY_STUDIO_PREVIEW_URL
```

## GitHub Actions

The root initializer/seed/check regression suite can run through the existing required Studio CI job:

```yaml
- name: Test Proti setup
  run: pnpm test:proti
```

## Vercel

The initializer configures local files only. Vercel environment variables remain separate and must be configured on the Vercel project.

## Not automated

The initializer does not create a Sanity project, configure GitHub/Vercel secrets, deploy Studio/Web, or generate opinionated demo content.
