import type { ContentBlockProps } from "mino-ui/blocks/ContentBlock";

import type { CmsContentBlock } from "@/cms/types";

import { mapCtas } from "@/cms/mappers/cta";
import { mapSectionHeading } from "@/cms/mappers/section-heading";
import { resolveSanityImage } from "@/cms/resolvers/image";

const IMAGE_DISPLAY_WIDTH: Record<
  NonNullable<CmsContentBlock["imageSize"]>,
  number
> = {
  sm: 160,
  md: 240,
  lg: 360,
  full: 800,
};

function resolveContentImage(block: CmsContentBlock): string | undefined {
  if (block.mediaType !== "image") {
    return undefined;
  }

  const imageSize = block.imageSize ?? "full";
  const displayWidth = IMAGE_DISPLAY_WIDTH[imageSize];

  /*
   * Generate approximately 2x the CSS display size for high-DPI screens.
   */
  const width = displayWidth * 2;

  /*
   * Circle is rendered 1:1, so request a square crop from Sanity.
   * This makes the Studio hotspot affect which area stays visible.
   *
   * Non-circle images only request a width. Passing the complete
   * image object still preserves the editor's explicit crop.
   */
  const height = block.imageShape === "circle" ? width : undefined;

  return resolveSanityImage(block.image, {
    width,
    height,
  });
}

export async function mapContentBlock(
  block: CmsContentBlock,
): Promise<ContentBlockProps> {
  const ctas = await mapCtas(block.ctas);

  const heading = mapSectionHeading(block.heading);

  const layout = block.layout ?? "default";

  const imageSrc = resolveContentImage(block);

  const videoSrc = block.mediaType === "video" ? block.videoUrl : undefined;

  const mediaPosition =
    layout === "default"
      ? (block.defaultMediaPosition ?? "below")
      : (block.splitMediaPosition ?? "right");

  return {
    ...heading,

    headingProps: {
      level: block.headingLevel ?? 2,

      size: block.headingSize ?? "2xl",
    },

    layout,

    alignment: block.alignment ?? "left",

    vAlignment: block.vAlignment ?? "center",

    mediaPosition,

    imageSrc,

    imageAlt: block.image?.alt ?? "",

    imageShape: block.imageShape ?? "rounded",

    imageSize: block.imageSize ?? "full",

    videoSrc,

    ctas,

    ctaGroupProps: {
      stackOnMobile: block.ctaStackOnMobile ?? true,
    },
  };
}
