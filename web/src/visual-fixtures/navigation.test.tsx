import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Navigation's production image/link resolvers import the Sanity client at
// module scope. Unit tests must not require Sanity credentials or query CMS.
const sanityFetch = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("Navigation fixtures must not query Sanity");
  }),
);

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    config: () => ({ projectId: "fixture123", dataset: "production" }),
    fetch: sanityFetch,
  },
}));

import {
  mapNavigationFooter,
  mapNavigationHeader,
} from "@/cms/mappers/navigation";
import { navigationVisualFooter, navigationVisualHeader } from "./navigation";

beforeEach(() => {
  vi.stubEnv("PROTI_VISUAL_FIXTURES", "1");
  sanityFetch.mockClear();
});

afterEach(() => vi.unstubAllEnvs());

describe("Navigation visual fixture", () => {
  it("maps real link, dropdown, and megamenu content without querying Sanity", async () => {
    const header = await mapNavigationHeader(navigationVisualHeader);

    expect(header).not.toBeNull();
    expect(header?.logo).toEqual({ alt: "Proti", text: "Proti" });
    expect(header?.align).toBe("center");
    expect(header?.isSticky).toBe(true);
    expect(header?.items.map((item) => item.label)).toEqual([
      "Home",
      "Products",
      "Solutions",
      "Contact",
    ]);
    expect(header?.items[0]).toMatchObject({ href: "#fixture-home" });
    expect(header?.items[1].children).toMatchObject([
      { label: "Component Library", href: "#fixture-components" },
      { label: "Website Starter", href: "#fixture-starter" },
    ]);

    const mega = header?.items[2].megaMenu;
    expect(mega?.columns).toBe(4);
    expect(mega?.sections.map((section) => section.type)).toEqual([
      "links",
      "tiles",
      "feature",
    ]);
    expect(mega?.sections[0]).toMatchObject({
      type: "links",
      title: "Explore",
      items: [
        { label: "Documentation", href: "#fixture-documentation" },
        { label: "Guides", href: "#fixture-guides" },
      ],
    });
    expect(mega?.sections[1]).toMatchObject({
      type: "tiles",
      columns: 2,
      items: [
        { label: "Mino UI components", href: "#fixture-components" },
        { label: "Sanity CMS", href: "#fixture-starter" },
      ],
    });
    expect(mega?.sections[2]).toMatchObject({
      type: "feature",
      title: "Start with Proti",
      presentation: "card",
      href: "#fixture-starter",
    });

    const tiles = mega?.sections[1];
    if (tiles?.type !== "tiles") {
      throw new Error("Expected the second megamenu section to contain tiles");
    }
    expect(tiles.items[0].illustration).toBeDefined();
    expect(sanityFetch).not.toHaveBeenCalled();
  });

  it("maps the real footer columns, legal links and text logo", async () => {
    const footer = await mapNavigationFooter(navigationVisualFooter);

    expect(footer).not.toBeNull();
    expect(footer?.logo).toEqual({ alt: "Proti", text: "Proti" });
    expect(footer?.columns.map((column) => column.title)).toEqual([
      "Platform",
      "Resources",
      "Company",
    ]);
    expect(footer?.columns[0].links).toMatchObject([
      { label: "Components", href: "#fixture-components" },
      { label: "Starter", href: "#fixture-starter" },
    ]);
    expect(footer?.legalLinks.map((link) => link.label)).toEqual([
      "Privacy",
      "Accessibility",
    ]);
    expect(footer?.copyright).toContain("2026 Proti");
    expect(sanityFetch).not.toHaveBeenCalled();
  });
});
