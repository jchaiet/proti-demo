"use client";

import { GridBlock, type GridBlockProps } from "mino-ui/blocks/GridBlock";

/**
 * Temporary Proti integration fix until Mino UI sets `aspect-ratio` directly
 * on the GridBlock image-only tile wrapper.
 *
 * Mino's unloaded .imageWrapper currently collapses to ~48px even though its
 * child <img> has width/height attributes. A CSS rule on the *wrapper*,
 * rendered before GridBlock, reserves the tile's real aspect ratio.
 *
 * Restrict this to image-only Grid items, not the card images. CSS classes are
 * scoped by the Mino semantic class prefix, rather than its generated hash.
 */
function imageTileReservationRules(items: GridBlockProps["items"]): string {
  const uniqueSizes = new Set<string>();

  for (const item of items ?? []) {
    if (item.type !== "image") continue;

    const { imageWidth: width, imageHeight: height } = item;
    if (
      typeof width !== "number" ||
      typeof height !== "number" ||
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width <= 0 ||
      height <= 0
    ) {
      continue;
    }

    uniqueSizes.add(`${width}:${height}`);
  }

  return Array.from(uniqueSizes, (pair) => {
    const [width, height] = pair.split(":").map(Number);

    // The immediate-parent structure and semantic Mino class names were
    // verified in the Lighthouse DOM diagnostics. `:has` is supported by
    // the Chromium, Firefox and Safari versions used by this starter.
    return `[data-proti-grid-image-geometry] :is(div, a)[class*="_imageWrapper_"]:has(> img[class*="_gridItemImage_"][width="${width}"][height="${height}"]) { box-sizing: border-box; height: auto; min-height: 0; aspect-ratio: ${width} / ${height}; }`;
  }).join("\n");
}

export function Grid(props: GridBlockProps) {
  const reservationCss = imageTileReservationRules(props.items);

  // Avoid adding another element to the layout for grids without image tiles.
  if (!reservationCss) {
    return <GridBlock {...props} />;
  }

  return (
    <div data-proti-grid-image-geometry style={{ display: "contents" }}>
      {/* Output before GridBlock so image tile dimensions are reserved in SSR. */}
      <style>{reservationCss}</style>
      <GridBlock {...props} />
    </div>
  );
}
