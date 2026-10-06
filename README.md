# Proti — Website + CMS Starter

Proti is a reusable website starter built with Next.js and Sanity. It combines a production web application, a structured CMS, localization/translation workflows, search, taxonomy, reusable page-builder blocks, visual editing, cache revalidation, and automated regression testing.

The web application uses Mino UI as its component library.

## Repository Structure

```text
.
├── web/       Next.js application
├── studio/    Sanity Content Studio
└── package.json
```

The root package provides convenience scripts for starting and building each package.

## Prerequisites

- Node.js compatible with the versions of Next.js and Sanity used by this repository
- pnpm
- A Sanity project and dataset
- The local Mino UI package referenced by `web/package.json`

The Web package currently references:

```text
mino-ui-0.0.2.tgz
```

Make sure that package is available at the expected location before installing Web dependencies.

## Install

Install each application:

```bash
pnpm --dir web install
pnpm --dir studio install
```

## Configure the Web Application

Copy the Web environment template:

```bash
cp web/.env.example web/.env.local
```

Populate the Sanity project, dataset, API tokens, Studio URL, and revalidation secret as appropriate for the environment.

See [web/README.md](web/README.md) for variable details.

The Studio does not currently require a `studio/.env.example`. Its Sanity project/dataset configuration remains in the Studio configuration. If that configuration is moved to environment variables later, add a Studio env template at the same time.

## Development

Run the Web application:

```bash
pnpm dev:web
```

Run Sanity Studio in a second terminal:

```bash
pnpm dev:studio
```

Default local URLs are typically:

```text
Web:    http://localhost:3000
Studio: http://localhost:3333
```

For Proti's host-based Site resolution, use `localhost:3000` rather than substituting `127.0.0.1:3000` unless the Sanity Site document is configured for that host.

## Build

From the repository root:

```bash
pnpm build:web
pnpm build:studio
```

## Core Capabilities

Proti includes:

- Hierarchical Pages and reusable page-builder blocks
- Blogs, Authors, citations, editorial metadata, and taxonomy
- Header, Footer, and Navigation Set documents
- Reusable Modals and Singletons
- Multi-locale content and translation creation workflows
- Exact page-to-page language switching
- Search and dynamic Document Lists
- Grouped taxonomy filters and configurable sorting
- SEO metadata and structured data
- Draft Mode and Sanity visual editing
- Sanity webhook-driven production cache revalidation
- Unit/integration testing with Vitest
- Browser and visual regression testing with Playwright

## Locale and Translation Rules

The default locale uses an unprefixed URL. Additional locales use a locale prefix.

Example:

```text
English: /products/widget
Spanish: /us-es/products/widget
```

Equivalent translations should keep the same logical path whenever possible.

The language selector only exposes an exact translation of the current content:

- If an alternate translation exists, it is selectable.
- If an alternate translation does not exist, that locale is not offered.
- If there are no additional translations, the language selector is hidden.
- The selector does not fall back to a locale homepage.

See the Web and Studio READMEs for implementation and authoring details.

## Taxonomy Rules

Taxonomy distinguishes between organizational groups and assignable terms:

- **Group / Folder**: hierarchy/organization only.
- **Taxonomy Term**: assignable taxonomy concept.
- **Available for Blog Tagging** controls whether a Term can be selected on Blog documents.
- **Include in Visitor Filters** controls whether a Term can be exposed in visitor-facing Document List filters.

Those settings are independent. A Term can be available for Blog tagging without being exposed as a visitor filter, or vice versa.

## Document Lists

Document Lists support manual or dynamic content.

Dynamic lists can use:

- Content-type scope
- Taxonomy restrictions
- Search
- Visitor filter groups
- Pagination
- Standard sort options
- Whitelisted custom sort options

Visitor taxonomy filters are organized into explicit groups such as:

```text
Type
- Article
- Video

Treatment
- Asthma
- Diabetes
```

Selections within a group use the configured Any/All behavior. Separate groups combine using AND semantics.

## Testing and Release Validation

Package-specific test commands are documented in the package READMEs.

Before a release, the expected validation is:

1. Studio tests/build pass.
2. Web unit/integration tests pass.
3. Web TypeScript check passes.
4. Web production build and lint pass.
5. Playwright smoke tests pass against the production build.
6. Playwright visual tests pass against the production build.
7. Sanity publish/update behavior and webhook revalidation are verified in a deployed environment.

Visual regression baselines should be generated and compared against the production Next.js build (`pnpm build` + `pnpm start`), not mixed between development and production rendering.

## Package Documentation

- [Web application documentation](web/README.md)
- [Sanity Studio documentation](studio/README.md)
