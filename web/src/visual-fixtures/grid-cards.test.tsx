import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sanityFetch = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("Visual fixtures must not query Sanity");
  }),
);

// Other block mappers import the client at module scope, even when those
// blocks are absent. This mock only prevents initialization/network access.
vi.mock("@/sanity/client", () => ({
  sanityClient: {
    config: () => ({ projectId: "fixture123", dataset: "production" }),
    fetch: sanityFetch,
  },
}));

import { BlockRenderer } from "@/components/BlockRenderer";
import type { CmsImage } from "@/cms/types";
import {
  resolveSanityImage,
  resolveSanityImageDimensions,
  resolveSanityImageSrcSet,
} from "@/cms/resolvers/image";
import { cardsVisualBlocks } from "./cards";
import { gridVisualBlocks } from "./grid";
import { fixtureImage } from "./images";

const context = { siteId: "visual-fixtures", locale: "en-us" };

beforeEach(() => {
  vi.stubEnv("PROTI_VISUAL_FIXTURES", "1");
  sanityFetch.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("Grid and Cards visual fixtures", () => {
  it("renders one-, two- and three-column grids through the real renderer", async () => {
    const markup = renderToStaticMarkup(
      await BlockRenderer({ blocks: gridVisualBlocks, context }),
    );
    expect(markup).toContain("Single-column reference");
    expect(markup).toContain("Image tiles in a responsive grid");
    expect(markup).toContain("Mixed cards at desktop width");
    expect(markup).toContain("Designing predictable components");
    expect(markup).toContain("A card without artwork");
    expect(markup).toContain("/visual-fixtures/assets/grid-pattern.svg");
    expect(markup).toContain('data-block-background="surface"');
    expect(sanityFetch).not.toHaveBeenCalled();
  });

  it("renders Article and Resource card variants through the real renderer", async () => {
    const markup = renderToStaticMarkup(
      await BlockRenderer({ blocks: cardsVisualBlocks, context }),
    );
    expect(markup).toContain("Article card variants");
    expect(markup).toContain("Resource card variants");
    expect(markup).toContain("A practical design system");
    expect(markup).toContain("Accessible content, no image");
    expect(markup).toContain("Responsive interface checklist");
    expect(markup).toContain("Content style reference");
    expect(markup).toContain("/visual-fixtures/assets/article-cover.svg");
    expect(sanityFetch).not.toHaveBeenCalled();
  });

  it("only accepts restricted local assets when the fixture flag is enabled", () => {
    const image = fixtureImage("grid-pattern.svg", "Test pattern");
    expect(resolveSanityImage(image)).toBe(
      "/visual-fixtures/assets/grid-pattern.svg",
    );
    expect(resolveSanityImageDimensions(image)).toEqual({
      width: 1200,
      height: 675,
    });
    expect(resolveSanityImageSrcSet(image)).toBeUndefined();

    const bad: CmsImage = {
      visualFixture: {
        src: "https://example.com/untrusted.png",
        width: 1200,
        height: 675,
      },
    };
    expect(resolveSanityImage(bad)).toBeUndefined();

    vi.stubEnv("PROTI_VISUAL_FIXTURES", "0");
    expect(resolveSanityImage(image)).toBeUndefined();
    expect(resolveSanityImageDimensions(image)).toBeUndefined();
  });
});
