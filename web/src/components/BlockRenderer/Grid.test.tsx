import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GridBlockProps } from "mino-ui/blocks/GridBlock";

const mocks = vi.hoisted(() => ({ renderGrid: vi.fn() }));

vi.mock("mino-ui/blocks/GridBlock", () => ({
  GridBlock: (props: GridBlockProps) => {
    mocks.renderGrid(props);
    return <section data-testid="mino-grid" />;
  },
}));

import { Grid } from "./Grid";

describe("Grid adapter", () => {
  it("forwards image-only tile dimensions to Mino unchanged", () => {
    const props: GridBlockProps = {
      cols: 2,
      items: [
        {
          type: "image",
          imageSrc: "/wide.svg",
          imageWidth: 1200,
          imageHeight: 675,
          imageAlt: "Wide image",
        },
        {
          type: "image",
          imageSrc: "/square.svg",
          imageWidth: 800,
          imageHeight: 800,
          href: "/gallery",
          imageAlt: "Square image",
        },
      ],
    };

    const html = renderToStaticMarkup(<Grid {...props} />);

    expect(mocks.renderGrid).toHaveBeenCalledWith(props);
    expect(html).toContain('data-testid="mino-grid"');
    expect(html).not.toContain("data-proti-grid-image-geometry");
    expect(html).not.toContain("<style>");
  });

  it("does not inject layout rules for mixed or unsized grids", () => {
    const props: GridBlockProps = {
      items: [
        { type: "image", imageSrc: "/unknown.svg" },
        {
          type: "article",
          article: {} as NonNullable<
            GridBlockProps["items"]
          >[number]["article"],
        },
      ],
    };

    const html = renderToStaticMarkup(<Grid {...props} />);

    expect(mocks.renderGrid).toHaveBeenCalledWith(props);
    expect(html).toBe('<section data-testid="mino-grid"></section>');
  });
});
