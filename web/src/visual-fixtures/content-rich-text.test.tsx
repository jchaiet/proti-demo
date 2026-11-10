import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Importing the real BlockRenderer also imports other CMS mappers.
// Prevent their module-level Sanity client from requiring project credentials.
const sanityFetch = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("Visual fixtures must not query Sanity");
  }),
);

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    config: () => ({ projectId: "fixture123", dataset: "production" }),
    fetch: sanityFetch,
  },
}));

import { BlockRenderer } from "@/components/BlockRenderer";
import { contentVisualBlocks } from "./content";
import { richTextVisualBlocks } from "./rich-text";

const context = { siteId: "visual-fixtures", locale: "en-us" };

describe("Content and Rich Text visual fixtures", () => {
  it("renders Content through the actual block mapper and renderer", async () => {
    const tree = await BlockRenderer({ blocks: contentVisualBlocks, context });
    const markup = renderToStaticMarkup(tree);

    expect(markup).toContain("PROTI CONTENT FIXTURE");
    expect(markup).toContain("Content that stays consistent");
    expect(markup).toContain("This Content Block checks typography");
    expect(markup).toContain('data-block-background="surface"');
    expect(sanityFetch).not.toHaveBeenCalled();
  });

  it("renders Rich Text headings, marks, list items, and quotes", async () => {
    const tree = await BlockRenderer({ blocks: richTextVisualBlocks, context });
    const markup = renderToStaticMarkup(tree);

    expect(markup).toContain("Portable Text rendering");
    expect(markup).toContain("Stable editorial typography");
    expect(markup).toContain("<strong>strong emphasis</strong>");
    expect(markup).toContain("<em>italic emphasis</em>");
    expect(markup).toContain("Consistent paragraph spacing");
    expect(markup).toContain("<blockquote>");
    expect(sanityFetch).not.toHaveBeenCalled();
  });
});
