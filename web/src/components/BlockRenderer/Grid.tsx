"use client";

import { GridBlock, type GridBlockProps } from "mino-ui/blocks/GridBlock";

/** Thin adapter: image tile layout reservation is owned by Mino UI. */
export function Grid(props: GridBlockProps) {
  return <GridBlock {...props} />;
}
