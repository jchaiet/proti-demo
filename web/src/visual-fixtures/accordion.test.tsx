import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// BlockRenderer imports other CMS mappers at module scope. Keep the unit test
// independent from Sanity credentials and fail if any code tries to fetch.
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

import { mapAccordionBlock } from "@/cms/mappers/blocks/accordion";
import { BlockRenderer } from "@/components/BlockRenderer";
import { accordionVisualBlocks } from "./accordion";

const context = { siteId: "visual-fixtures", locale: "en-us" };

describe("Accordion visual fixture", () => {
  it("maps stable items and preserves the multi-open and single-open modes", async () => {
    const [multiple, exclusive] = accordionVisualBlocks;
    const [multiProps, exclusiveProps] = await Promise.all([
      mapAccordionBlock(multiple),
      mapAccordionBlock(exclusive),
    ]);

    expect(multiProps.accordionProps?.multiple).toBe(true);
    expect(multiProps.accordionProps?.items).toMatchObject([
      { id: "accordion-multi-rendering", defaultOpen: false },
      { id: "accordion-multi-content", defaultOpen: false },
      { id: "accordion-multi-responsive", defaultOpen: false },
    ]);
    expect(exclusiveProps.layout).toBe("split");
    expect(exclusiveProps.accordionPosition).toBe("right");
    expect(exclusiveProps.accordionProps?.multiple).toBe(false);
    expect(exclusiveProps.accordionProps?.items).toHaveLength(2);
  });

  it("renders both accordions through the real BlockRenderer", async () => {
    const markup = renderToStaticMarkup(
      await BlockRenderer({ blocks: accordionVisualBlocks, context }),
    );

    expect(markup).toContain("Frequently asked questions");
    expect(markup).toContain("How are visual fixtures rendered?");
    expect(markup).toContain("Why use predictable content?");
    expect(markup).toContain("What happens on smaller screens?");
    expect(markup).toContain("One panel at a time");
    expect(markup).toContain("Which panel opens first?");
    expect(markup).toContain("Can a second panel replace it?");
    expect(markup).toContain('data-block-background="surface"');
    expect(markup).toContain('data-block-background="brand-muted"');
    expect(sanityFetch).not.toHaveBeenCalled();
  });
});
