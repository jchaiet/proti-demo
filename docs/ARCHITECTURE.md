# Proti architecture (v0.6.0 developer reference)

Proti is a multi-site, multi-locale website starter. **Web** renders public experiences with Next.js and Mino UI; **Studio** owns Sanity content modeling and editorial workflows; **scripts** initialize, seed and validate a new implementation. See [Getting Started](GETTING_STARTED.md) for installation.

## Repository responsibilities

| Area                    | Responsibility                                                       | Implementation entry points                                                                      |
| ----------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `web/src/app`           | Public routes, metadata, sitemap, robots, API routes                 | `[[...path]]/page.tsx`, `sitemap.ts`, `robots.ts`, `api/`                                        |
| `web/src/sanity`        | Sanity client, GROQ fragments/queries, fetch and caching             | `client.ts`, `fetch.ts`, `queries/`, `fragments/`                                                |
| `web/src/cms/resolvers` | Convert CMS documents into route- and component-ready models         | `route.ts`, `page.ts`, `blog.ts`, `author.ts`, `seo.ts`                                          |
| `web/src/cms/mappers`   | Map CMS block/card/CTA shapes to Mino UI props                       | `blocks/`, `cards/`, `cta-group.ts`                                                              |
| `web/src/components`    | Site shell, page templates, block rendering, modals                  | `SiteLayout/`, `BlockRenderer/`, `Blog/`, `Author/`                                              |
| `studio/schemaTypes`    | Document, block, object, and form schemas and validation             | `documents/`, `blocks/`, `objects/`, `forms/`                                                    |
| `studio/structure`      | Site/locale-focused editorial navigation                             | `index.ts` and section modules                                                                   |
| `studio/actions`        | Creation and resolution of translated documents                      | `ShowTranslationsAction.tsx`                                                                     |
| `scripts`               | Initialization, Site seeding, offline/live checks, developer presets | `proti-init.mjs`, `proti-seed.mjs`, `proti-env-check.mjs`, `proti-check.mjs`, `proti-verify.mjs` |

## Independent-project lifecycle and identity

`proti:init --new-project` intentionally creates a new project identity in a clean clone, with explicit `RESET GIT HISTORY` confirmation. The maintained Proti source checkout is protected by local-only `git config --local proti.sourceRepository true`; newly initialized sites are marked `proti.initialized=true` in their own `.git/config`. The generator writes project config, package names, Web/Studio local env files, and separate public Studio development/production Presentation URL files. It clears inherited demo screenshot PNGs on **first** independent initialization only.

`proti:seed` optionally creates a minimal published Site/homepage/navigation structure. `proti:check` checks local configuration and the published Sanity Site without modifying them. `proti:visual:init` creates project-owned Chromium screenshot baselines against a production Next server. The disposable acceptance test checks this combined lifecycle with mock Sanity access; the actual hosted deployment remains a separate integration verification.

The original/source repository and every new independent implementation are different **Git histories**, not merely new Sanity datasets under one shared demo deployment. See [Project Initialization](PROJECT_INITIALIZATION.md).

## Runtime and environment boundaries

- **Web** (`web/.env.local` locally; Vercel env in production): Sanity project/dataset/Studio URL; read/write tokens and revalidation secret are server-only.
- **Studio shared** (`studio/.env.local`): project/dataset/title and optional App ID for environment-driven Studio CLI deployment.
- **Studio mode** (`studio/.env.development`, `.env.production`): public Web Presentation URLs for each mode, tracked without secrets. Production changes require Studio redeployment.
- **Routing**: a Site document resolves by hostname, `localhost` distinct from `127.0.0.1`; new projects include localhost for dev/CI and use the actual production hostname as canonical.
- **Browser CI**: production Next server readiness at `/api/health`; smoke checks real CMS-backed pages; separate guarded visual-fixture builds use version-controlled CMS-shaped data. Lighthouse budgets also use these fixtures.

## Request → rendered page

1. A request reaches the Next.js optional catch-all route, `web/src/app/[[...path]]/page.tsx`.
2. Request host selects the Site via `web/src/sanity/queries/site.ts`. **Site domains are hostnames**; `localhost` and `127.0.0.1` are different host matches.
3. `web/src/lib/routing/locale.ts` interprets an optional locale prefix. The Site default locale has **no public prefix**.
4. `web/src/cms/resolvers/route.ts` applies route precedence: CMS redirect → explicitly prefixed default-locale canonical redirect → Author → Blog taxonomy → Blog detail → Page → not found. Reserved content routes do not fall through to arbitrary Pages.
5. Sanity queries load published (or Draft Mode) content. CMS resolvers and mappers create models consumed by templates and `BlockRenderer`.
6. Metadata and JSON-LD are built separately from page rendering. `SiteLayout` composes navigation, header utilities, and modals.

## Data and ownership boundaries

- **Site**: domain/canonical origin, locales/default locale, navigation assignments, per-locale SEO defaults, Organization entity data.
- **Page**: hierarchical Site + Locale routing, SEO and authored sections.
- **Blog**: Site + Locale + slug, editorial fields, references and sections.
- **Author**: one Site-scoped identity with default-locale fields plus localized translation entries, not one separate Author document per language.
- **Taxonomy**: hierarchical, Site-scoped terms/groups with localized display values and independent blog-tag/filter visibility.
- **Navigation Set**: Site + Locale assignment of Header and Footer Navigation.
- **Modal / Singleton**: keyed reusable content.

See [Content Model](CONTENT_MODEL.md), [Translations](TRANSLATIONS.md), and [Components](COMPONENTS.md).

## Published, draft, and cache behavior

`web/src/sanity/fetch.ts` uses published perspective for ordinary requests. During local development, published fetches opt out of persistent caching. Production published fetches use caching that the Sanity webhook invalidates. Draft Mode requires a server-side read token and uses Sanity Live for Presentation/visual editing. The public revalidation API validates a signed webhook and invalidates affected paths, including dependencies and old/new paths for route changes.

Do not use a local `pnpm start` instance as proof that a remotely configured webhook works; verify webhook updates on the deployed endpoint. See [Deployment](DEPLOYMENT.md).

## Component ownership: Sanity, Proti, and Mino UI

```text
Studio editor fields / schema
  -> Web GROQ projection (web/src/sanity/fragments/blocks + queries)
  -> CMS shape (web/src/cms/types/blocks)
  -> mapper (web/src/cms/mappers/blocks)
  -> BlockRenderer (web/src/components/BlockRenderer/index.tsx)
  -> Proti adapter or Mino UI block (mino-ui/blocks/*)
```

- **Studio** owns field names, validation, editorial controls, and content structure; avoid changing stored field names without compatibility/migration handling.
- **Proti Web** owns fetching, fallbacks, Sanity-to-UI mapping, routes, SEO, layout composition, and server/client boundaries.
- **Mino UI** owns reusable presentational primitives and visual interactions. Prefer extending Mino when the change benefits other sites; use Proti wrappers for CMS-specific adaptation. Keep tokens and shared `sectionHeading`, `blockStyles`, and `ctaGroup` contracts consistent.
- **Fixture pages** under `web/src/app/visual-fixtures/` render production adapters with CMS-shaped **version-controlled** data under `web/src/visual-fixtures/`. They require `PROTI_VISUAL_FIXTURES=1` **at build time**. A normal production build must return 404 on those routes.

The concrete walk-through for extending Accordion and registering a new block is in [Components](COMPONENTS.md).

## Adding a new page template or public route

**First decide whether a new template is necessary.** Most marketing/editorial pages should use the existing hierarchical `Page` document and `BlockRenderer`, rather than a new document type and public route.

If the design really needs a separate type (for example, a custom collection detail view), follow this order:

1. **Studio model:** define and register the document in `studio/schemaTypes/index.ts`; assign Site and locale relationships, slug rules, and validation, and expose it through the appropriate Studio structure.
2. **Query + resolver:** add site/locale-scoped query and resolved CMS type in `web/src/sanity/queries/` and `web/src/cms/resolvers/`. Handle missing/published/draft content explicitly.
3. **Route contract:** update the route shape helpers in `web/src/lib/routing/route-shapes.ts` and the `ResolvedRoute` union/precedence in `web/src/cms/resolvers/route.ts`. Reserved routes must fail closed rather than unexpectedly falling through to a Page with the same slug.
4. **Template + metadata:** implement the template under `web/src/components/`, then integrate its rendering in `web/src/app/[[...path]]/page.tsx`. **Also update `generateMetadata`** in the same entry point, including the correct canonical origin, exact translated alternates, indexing behavior, and structured data where appropriate.
5. **Cross-cutting routing:** consider breadcrumbs, sitemap and search visibility, translation switching, redirects, cache invalidation and revalidation dependencies.
6. **Tests:** add route-shape/precedence and resolver unit tests; metadata and public-path assertions; a fixture-backed visual/a11y test where the UI is new; and a real CMS smoke test if publication is required.

A Next.js file route under `web/src/app/` is sometimes appropriate for a non-CMS utility, but still check for conflicts with the optional catch-all and SEO/locale handling. Review [Translations](TRANSLATIONS.md), [SEO/GEO](SEO_GEO.md), and [Testing](TESTING.md) before exposing a new route.

## Related tests

- Routing and locales: `web/src/lib/routing/`, `web/src/cms/resolvers/route.ts`, and related tests.
- SEO and structured data: `web/src/cms/resolvers/seo.test.ts`, `structured-data.test.ts`, and the catch-all SEO-output integration test.
- Published webhook impact: `web/src/cms/revalidation/` and `web/src/app/api/revalidate/route.test.ts`.
- Browser smoke: `web/e2e/smoke.spec.ts` against the configured published Sanity Site.
- Deterministic browser fixtures: `web/e2e/visual-*.spec.ts`, `a11y-fixtures.spec.ts`, and `grid-image-layout.spec.ts` (current fixture runners also include the latter two).
- Initialization and independent-project safeguards: root `scripts/proti-*.test.mjs`.

Use `pnpm verify:quick` for local code/unit checks and `pnpm verify:all` for browser and Lighthouse coverage. See [Developer Commands](DEVELOPER_COMMANDS.md), [Testing](TESTING.md), and [Visual CI](VISUAL_CI.md). **Never deploy the fixture-enabled build.**
