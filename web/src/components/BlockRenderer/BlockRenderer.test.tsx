import { describe, expect, it, vi } from "vitest";

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
