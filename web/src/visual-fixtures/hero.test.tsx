import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Prevent CMS initialization and network requests during fixture tests.
const sanityFetch = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("Visual fixtures must not query Sanity");
  }),
);

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    config: () => ({
      projectId: "fixture123",
      dataset: "production",
    }),
    fetch: sanityFetch,
  },
}));

import { BlockRenderer } from "@/components/BlockRenderer";
import { heroVisualBlocks } from "@/visual-fixtures/hero";

describe("Hero visual fixture", () => {
  it("renders through the real BlockRenderer without fetching Sanity content", async () => {
    const tree = await BlockRenderer({
      blocks: heroVisualBlocks,
      context: {
        siteId: "visual-fixtures",
        locale: "en-us",
      },
    });

    const markup = renderToStaticMarkup(tree);

    expect(markup).toContain("Build confidently with Proti");

    expect(markup).toContain("PROTI VISUAL REGRESSION");

    expect(markup).toContain("Explore the fixture");

    expect(markup).toContain('href="#fixture-details"');

    expect(sanityFetch).not.toHaveBeenCalled();
  });
});
