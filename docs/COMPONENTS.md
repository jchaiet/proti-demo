# Page Builder components and Mino UI integration

Editors author sections in Sanity; the Web app queries content, maps it to component props, and renders using Mino UI where applicable. This separates CMS storage from presentational component behavior.

**Current visual approach:** Proti uses deterministic fixture routes (`web/src/app/visual-fixtures/`) with CMS-shaped data (`web/src/visual-fixtures/`). They render the real `BlockRenderer`/Mino adapters without depending on published Sanity content. New independent projects generate approved baselines with `pnpm proti:visual:init`. See [Visual CI](VISUAL_CI.md).

## Current block catalogue

| Block               | Editorial purpose                                               | Web mapping/rendering                                        |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| Hero                | Prominent heading/media/CTA section; multiple layouts/alignment | `hero.ts` / `BlockRenderer/Hero.tsx`                         |
| Content             | Content + optional media with default/split layouts             | `content.ts` / `Content.tsx`                                 |
| Carousel            | Repeated slide/card experiences                                 | `carousel.ts` / `Carousel.tsx`                               |
| Accordion           | Expand/collapse content groups                                  | `accordion.ts` / `Accordion.tsx`                             |
| Tabs                | Tabbed content                                                  | `tabs.tsx` / `Tabs.tsx`                                      |
| Grid                | Layout for card or image items, optionally split                | `grid.tsx` / `Grid.tsx`                                      |
| Form                | Editor-configurable input fields and form layouts               | `form.tsx` / `Form.tsx`                                      |
| Document List       | Curated or dynamic content with search/filter/sort/paging       | `document-list.ts` / `DocumentList.tsx`                      |
| Rich Text           | Portable Text body sections                                     | `rich-text.tsx` / `RichText.tsx`                             |
| Poll                | Interactive question and vote behavior                          | `poll.ts` / `Poll.tsx`                                       |
| Singleton Reference | Include reusable authored content                               | `studio/.../singletonReferenceBlockType.ts`; `BlockRenderer` |

Not every document allows every block: consult `studio/schemaTypes/documents/pageType.ts` and `blogType.ts`. The registry is `studio/schemaTypes/index.ts`.

## Shared heading and block styling

The shared `sectionHeading` object supports structured title/description, including actual heading levels. Placement and typography alignment are separate concerns: an author may align the content area differently from how text is aligned.

`blockStyles` provides semantic authoring controls: vertical padding, background, and content width. The renderer applies them through `web/src/components/BlockRenderer/BlockStyles/`. The values are design-system choices, **not arbitrary CSS**. Mino UI CSS variables can be customized through Web overrides (`web/src/app/mino-overrides.css`).

## CTAs and modals

Use the shared `ctaGroup` object for CTA items, alignment and stack direction where offered. A CTA can target a link or authored Modal. Modal rendering and accessibility behavior live in Web/Mino UI (`ModalRegistry` and UI components): test focus management, Escape dismissal, and background scroll locking after changes. Avoid replacing working modal behavior with manual DOM overlays.

## Grid and cards

Grid accepts image and supported card types (Article, Resource, Testimonial, Full Bleed), along with split/stacked layout options. **Desktop Columns** is the principal authored column count; the responsive renderer handles smaller breakpoints (mobile single column, tablet up to two, subject to the layout).

## Document List behavior

Document List supports manual selection and dynamic lists. Dynamic settings include content types, initial taxonomy constraints, initial sorting, search, visitor filters, optional grouped taxonomy filters, visitor sorting, and loading more results.

**Require Search or Filter** keeps the list in an initial state until the visitor enters a meaningful search or selects an active filter. Its stored field remains `requireSearchQuery` for compatibility. A reset/All choice does not count as an active filter; a completed query with no matches displays the empty state.

Each visitor Filter Group specifies its title, single/multiple selection, allowed Term values, and Any/All semantics **within the group**. Separate groups combine with AND. Sorting offers Relevance, Newest, Oldest, Title A–Z, Title Z–A, plus editor-configured supported custom sorts; arbitrary GROQ is not exposed to editors.

## Mino UI versus Proti ownership

Proti imports UI components using package subpaths such as `mino-ui/blocks/AccordionBlock`. Its Web dependencies declare the **versioned local Mino archive** (`web/mino-ui-0.0.3.tgz` in the supplied source), and `web/src/app/globals.css` imports `mino-ui/tokens` before local overrides. A Mino package update must include the correctly versioned tarball, `web/package.json`/lockfile changes as needed, and both focused and visual regression tests.

**Prefer Mino UI** for shared styling, layout and interaction fixes that should carry across sites. **Prefer Proti** for mapping Sanity field values, fallback handling, server-side data, and site-specific wrappers. For example, `web/src/components/BlockRenderer/Accordion.tsx` is a thin adapter for Mino's `AccordionBlock`; `web/src/cms/mappers/blocks/accordion.ts` maps stored Sanity items to Mino's `AccordionBlockProps`. Don't fork a Mino component merely to expose another editor control.

## Worked example: add an Accordion editor field

This is a trace through **existing source**, not a request to add a second Accordion implementation. The `multiple` field (allow multiple items open) demonstrates every layer:

1. **Editor field:** `studio/schemaTypes/blocks/accordionBlockType.ts` declares `multiple` as a boolean, with a default. Editor authors see it alongside the Accordion items.
2. **Projection:** `web/src/sanity/fragments/blocks/accordion.ts` includes `multiple` in `ACCORDION_BLOCK_FRAGMENT`; `web/src/sanity/queries/page.ts`, `blog.ts` and `modal.ts` include that fragment when resolving their sections.
3. **CMS type:** `web/src/cms/types/blocks/accordion.ts` declares `multiple?: boolean` in `CmsAccordionBlock` so older documents without the field still work.
4. **Mapping:** `web/src/cms/mappers/blocks/accordion.ts` supplies `accordionProps: { items, multiple: block.multiple ?? true }`, preserving the default when stored content omits it.
5. **Rendering:** `web/src/components/BlockRenderer/index.tsx` dispatches `_type: "accordionBlock"` to the mapper and the existing `Accordion` adapter, which renders Mino's `AccordionBlock`.
6. **Verification:** check Studio field validation and the mapped props in unit tests; then run `pnpm verify:quick` and `pnpm verify:fixtures` for a change that alters UI or behavior. The relevant fixture is `/visual-fixtures/accordion` and its test is `web/e2e/visual-accordion.spec.ts`.

For a **new** field, follow that same chain. Where a field changes layout/interaction, confirm Mino's prop type supports it before adding the editor option. Maintain backwards-compatible defaults for existing documents and do not silently rename stored fields.

## New block checklist: a simple Notice block

This is a **worked implementation plan**, not a ready-made feature in Proti. A basic `noticeBlock` (with `title` and `body`) would need these exact registration points:

| Step | Source location                                                                       | Required change                                                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `studio/schemaTypes/blocks/noticeBlockType.ts`                                        | Define `name: 'noticeBlock'`, `type: 'object'`, text fields, validation and editor preview. Reuse `blockStyles` if appropriate.                                                             |
| 2    | `studio/schemaTypes/index.ts`                                                         | Import and register the new `noticeBlockType`.                                                                                                                                              |
| 3    | `studio/schemaTypes/documents/pageType.ts`, `blogType.ts`, `singletonType.ts`         | Add an `of: [defineArrayMember({type: 'noticeBlock'})]` entry only for document types that should allow Notices. These documents currently have **different** supported block lists.        |
| 4    | `web/src/sanity/fragments/blocks/notice.ts` + `blocks/index.ts`                       | Define/export `NOTICE_BLOCK_FRAGMENT` with the projected fields. Import it into the relevant page/blog/modal/singleton queries; query `sections[]` must retain `_key` and `_type`.          |
| 5    | `web/src/cms/types/blocks/notice.ts`, `blocks/index.ts`, `web/src/cms/types/block.ts` | Add `CmsNoticeBlock` (`_type: 'noticeBlock'`, `_key`, optional authored fields), re-export it and extend the `CmsReusableBlockData` union.                                                  |
| 6    | `web/src/cms/mappers/blocks/notice.ts` + `index.ts`                                   | Map CMS values to display props, including defaults and portable-text conversion if the schema uses rich text.                                                                              |
| 7    | `web/src/components/BlockRenderer/Notice.tsx` + `index.tsx`                           | Implement or wrap the UI, then register a `case 'noticeBlock'` with `<BlockStyles key={block._key} config={block.styles}>` around it. Use Mino for reusable UI when possible.               |
| 8    | Tests + fixture                                                                       | Add Sanity validation and mapper/renderer tests, a CMS-shaped fixture and gated route, and update the fixture Playwright suite and baseline inventory/CI list when adding a new screenshot. |

For example, the schema's _core_ shape would be:

```ts
// Inside studio/schemaTypes/blocks/noticeBlockType.ts (illustrative)
import { defineField, defineType } from "sanity";

export const noticeBlockType = defineType({
  name: "noticeBlock",
  title: "Notice",
  type: "object",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: "body", type: "text", rows: 3 }),
  ],
});
```

The related **CMS field contract** can start with:

```ts
// Illustrative; place in web/src/cms/types/blocks/notice.ts
export interface CmsNoticeBlock {
  _type: "noticeBlock";
  _key: string;
  title: string;
  body?: string;
}
```

Do not stop at these two snippets: the schema must be registered, the query must actually project it, the type union and `BlockRenderer` switch must know it, and all intended content documents must expose it. If the block is reusable in a Singleton or Modal, add it to the nested projection paths there too. For a purely informational Notice without special interactivity, prefer semantic HTML in a small Proti adapter over creating a duplicate of a Mino primitive. Document any new public CSS tokens in the site's overrides.

## Test and release checklist for component changes

- **Unit/schema:** Run relevant Studio `vitest` validation tests and Web mapper/renderer tests; ensure absent legacy fields do not crash the page.
- **Functional/a11y:** Check keyboard semantics, focus/target sizes when applicable, heading order, meaningful image alt text, and mobile behavior.
- **Visual:** Build with `PROTI_VISUAL_FIXTURES=1` and compare deterministic baselines. Review expected/actual/diff before changing a PNG; never auto-approve in CI.
- **Performance:** Run Lighthouse budgets when images, CSS, font loading, hydration or interactive code changes. Reserve space for images before they load to protect CLS.
- **Deployment:** Build normally with fixtures **disabled**. Publish Sanity schema changes only when the corresponding Web data contract is ready.

The exact property names and supported document block lists are authoritative in the current Studio schemas, not screenshots or older guides. See [Architecture](ARCHITECTURE.md), [Testing](TESTING.md), and [Developer Commands](DEVELOPER_COMMANDS.md).
