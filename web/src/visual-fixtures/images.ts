import type { CmsImage } from "@/cms/types";

/**
 * Compile-time fixture helper: no Sanity references, remote hosts or dynamic
 * image services. The image resolver only honors visualFixture while opted in.
 */
export function fixtureImage(
  filename: "grid-pattern.svg" | "article-cover.svg" | "resource-cover.svg",
  alt: string,
): CmsImage {
  return {
    alt,
    visualFixture: {
      src: `/visual-fixtures/assets/${filename}`,
      width: 1200,
      height: 675,
    },
  };
}
