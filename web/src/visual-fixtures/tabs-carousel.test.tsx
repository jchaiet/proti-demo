import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BlockRenderer imports the CMS client through other block mappers. Unit tests
// must not require credentials or make requests to Sanity.
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

import { mapCarouselBlock } from "@/cms/mappers/blocks/carousel";
import { mapTabsBlock } from "@/cms/mappers/blocks/tabs";
import { BlockRenderer } from "@/components/BlockRenderer";
import { carouselVisualBlocks } from "./carousel";
import { tabsVisualBlocks } from "./tabs";

const context = { siteId: "visual-fixtures", locale: "en-us" };

beforeEach(() => {
  vi.stubEnv("PROTI_VISUAL_FIXTURES", "1");
  sanityFetch.mockClear();
});

afterEach(() => vi.unstubAllEnvs());

describe("Tabs and Carousel visual fixtures", () => {
  it("maps tabs with a stable default, accessible labels and local media", async () => {
    const mapped = await mapTabsBlock(tabsVisualBlocks[0]);

    expect(mapped.defaultActiveId).toBe("visual-tab-overview");
    expect(mapped.items).toHaveLength(3);
    expect(mapped.items?.map((item) => item.label)).toEqual([
      "Overview",
      "Details",
      "Accessibility",
    ]);
    expect(mapped.items?.[1].imageSrc).toBe(
      "/visual-fixtures/assets/grid-pattern.svg",
    );
    expect(mapped.items?.[1].imageSrcSet).toBeUndefined();
  });

  it("renders the real TabsBlock through BlockRenderer", async () => {
    const markup = renderToStaticMarkup(
      await BlockRenderer({ blocks: tabsVisualBlocks, context }),
    );

    expect(markup).toContain("Explore component states");
    expect(markup).toContain("Overview");
    expect(markup).toContain("Details");
    expect(markup).toContain("Accessibility");
    expect(markup).toContain('data-block-background="surface"');
    expect(sanityFetch).not.toHaveBeenCalled();
  });

  it("maps four carousel slides without autoplay or remote media", async () => {
    const mapped = await mapCarouselBlock(carouselVisualBlocks[0]);

    expect(mapped.items).toHaveLength(4);
    expect(mapped.items?.map((item) => item.type)).toEqual([
      "image",
      "image",
      "image",
      "image",
    ]);
    expect(mapped.items?.[0]).toMatchObject({
      id: "visual-carousel-slide-one",
      imageSrc: "/visual-fixtures/assets/grid-pattern.svg",
      imageWidth: 1200,
      imageHeight: 675,
    });
    expect(mapped.carouselProps).toMatchObject({
      itemsPerPage: 1,
      itemsPerRow: 1,
      autoPlay: false,
      mobilePeek: false,
    });
  });

  it("renders the real CarouselBlock through BlockRenderer", async () => {
    const markup = renderToStaticMarkup(
      await BlockRenderer({ blocks: carouselVisualBlocks, context }),
    );

    expect(markup).toContain("A consistent visual sequence");
    expect(markup).toContain("Carousel slide one: teal geometry");
    expect(markup).toContain('data-block-background="canvas"');
    expect(sanityFetch).not.toHaveBeenCalled();
  });
});
