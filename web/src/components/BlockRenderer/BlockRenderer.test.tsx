import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { mapHeroBlock } from "@/cms/mappers/blocks";
import type { CmsBlock } from "@/cms/types";

vi.mock("@/cms/mappers/blocks", () => ({
  mapAccordionBlock: vi.fn(),
  mapCarouselBlock: vi.fn(),
  mapContentBlock: vi.fn(),
  mapDocumentListBlock: vi.fn(),
  mapFormBlock: vi.fn(),
  mapGridBlock: vi.fn(),
  mapHeroBlock: vi.fn(),
  mapPollBlock: vi.fn(),
  mapRichTextBlock: vi.fn(),
  mapTabsBlock: vi.fn(),
}));

vi.mock("./Accordion", () => ({
  Accordion: () => null,
}));

vi.mock("./Carousel", () => ({
  Carousel: () => null,
}));

vi.mock("./Content", () => ({
  Content: () => null,
}));

vi.mock("./DocumentList", () => ({
  DocumentList: () => null,
}));

vi.mock("./Form", () => ({
  Form: () => null,
}));

vi.mock("./Grid", () => ({
  Grid: () => null,
}));

vi.mock("./Hero", () => ({
  Hero: () => null,
}));

vi.mock("./Poll", () => ({
  Poll: () => null,
}));

vi.mock("./RichText", () => ({
  RichText: () => null,
}));

vi.mock("./Tabs", () => ({
  Tabs: () => null,
}));

import { BlockRenderer } from "./index";

const context = {
  siteId: "site-1",
  locale: "en-us",
};

type HeroPriorityElement = ReactElement<{
  imageFetchPriority?: "high" | "low" | "auto";
  imageLoading?: "eager" | "lazy";
}>;

type HeroWrapperElement = ReactElement<{ children: HeroPriorityElement }>;
type BlockRendererElement = ReactElement<{ children: HeroWrapperElement[] }>;

describe("BlockRenderer empty content", () => {
  it("renders nothing when blocks are undefined", async () => {
    await expect(
      BlockRenderer({
        blocks: undefined,
        context,
      }),
    ).resolves.toBeNull();
  });

  it("renders nothing when Sanity returns null for an unset sections array", async () => {
    await expect(
      BlockRenderer({
        blocks: null,
        context,
      }),
    ).resolves.toBeNull();
  });

  it("renders nothing when the sections array is empty", async () => {
    await expect(
      BlockRenderer({
        blocks: [],
        context,
      }),
    ).resolves.toBeNull();
  });
});

describe("BlockRenderer LCP priority", () => {
  it("prioritizes the first CMS Hero only", async () => {
    vi.mocked(mapHeroBlock).mockResolvedValue({
      title: "Demo",
      imageSrc: "https://example.test/hero.jpg",
    });
    const result = await BlockRenderer({
      blocks: [
        { _type: "heroBlock", _key: "first" },
        { _type: "heroBlock", _key: "second" },
      ] as CmsBlock[],
      context,
    });

    const children = (result as BlockRendererElement).props.children;
    const firstHero = children[0].props.children;
    const secondHero = children[1].props.children;
    expect(firstHero.props.imageFetchPriority).toBe("high");
    expect(firstHero.props.imageLoading).toBe("eager");
    expect(secondHero.props.imageFetchPriority).toBe("auto");
    expect(secondHero.props.imageLoading).toBe("lazy");
  });

  it("does not prioritize CMS Hero content after a BlogHero", async () => {
    vi.mocked(mapHeroBlock).mockResolvedValue({
      title: "Related",
      imageSrc: "https://example.test/related.jpg",
    });
    const result = await BlockRenderer({
      blocks: [{ _type: "heroBlock", _key: "related" }] as CmsBlock[],
      context: { ...context, priorityHeroImage: false },
    });
    const children = (result as BlockRendererElement).props.children;
    const hero = children[0].props.children;
    expect(hero.props.imageFetchPriority).toBe("auto");
  });
});
