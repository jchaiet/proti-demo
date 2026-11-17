import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GridBlockProps } from "mino-ui/blocks/GridBlock";

// The real Mino renderer is exercised by the Playwright regression. Here,
// we check that Proti emits the correct dimensions before the block renders.
vi.mock("mino-ui/blocks/GridBlock", () => ({
  GridBlock: () => <section data-testid="mino-grid" />,
}));

import { Grid } from "./Grid";

function render(items: GridBlockProps["items"]) {
  return renderToStaticMarkup(
    <Grid {...({ cols: 2, items } as GridBlockProps)} />,
  );
}

describe("Grid image geometry (temporary Mino integration fix)", () => {
  it("reserves each distinct tile ratio before rendering Mino GridBlock", () => {
    const html = render([
      {
        id: "wide-1",
        type: "image",
        imageSrc: "/wide.svg",
        imageAlt: "Wide image",
        imageWidth: 1200,
        imageHeight: 675,
      },
      {
        id: "square",
        type: "image",
        imageSrc: "/square.svg",
        imageAlt: "Square image",
        imageWidth: 800,
        imageHeight: 800,
      },
      {
        id: "wide-2",
        type: "image",
        imageSrc: "/other-wide.svg",
        imageAlt: "Other wide image",
        imageWidth: 1200,
        imageHeight: 675,
      },
    ]);

    expect(html).toContain("data-proti-grid-image-geometry");
    expect(html).toContain('[width="1200"][height="675"]');
    expect(html).toContain("aspect-ratio: 1200 / 675");
    expect(html).toContain("aspect-ratio: 800 / 800");
    expect(html.match(/aspect-ratio: 1200 \/ 675/g)).toHaveLength(1);
    expect(html.indexOf("aspect-ratio")).toBeLessThan(
      html.indexOf('data-testid="mino-grid"'),
    );
  });

  it("does not alter ArticleCard/ResourceCard-only grids", () => {
    const html = render([
      { id: "one", type: "article", article: {} },
      { id: "two", type: "resource", resource: {} },
    ] as unknown as GridBlockProps["items"]);

    expect(html).not.toContain("data-proti-grid-image-geometry");
    expect(html).not.toContain("aspect-ratio");
    expect(html).toContain('data-testid="mino-grid"');
  });

  it("skips invalid or missing dimensions", () => {
    const html = render([
      {
        id: "missing",
        type: "image",
        imageSrc: "/missing.svg",
        imageAlt: "Unknown dimensions",
      },
      {
        id: "zero",
        type: "image",
        imageSrc: "/zero.svg",
        imageAlt: "Zero height",
        imageWidth: 1200,
        imageHeight: 0,
      },
    ]);

    expect(html).not.toContain("aspect-ratio");
    expect(html).not.toContain("data-proti-grid-image-geometry");
  });
});
