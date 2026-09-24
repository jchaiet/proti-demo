import { createImageUrlBuilder } from "@sanity/image-url";

import type { CmsImage } from "@/cms/types";

import { sanityClient } from "@/sanity/client";

const imageBuilder = createImageUrlBuilder(sanityClient);

export interface ResolveSanityImageOptions {
  width?: number;

  height?: number;

  quality?: number;
}

export type SanityImagePreset =
  | "avatar"
  | "card"
  | "content"
  | "hero"
  | "logo"
  | "social";

const IMAGE_PRESETS: Record<SanityImagePreset, ResolveSanityImageOptions> = {
  avatar: {
    width: 480,
    height: 480,
    quality: 90,
  },

  card: {
    width: 960,
    height: 540,
    quality: 85,
  },

  content: {
    width: 1600,
    quality: 85,
  },

  hero: {
    width: 1600,
    height: 900,
    quality: 88,
  },

  logo: {
    width: 512,
    quality: 90,
  },

  social: {
    width: 1200,
    height: 630,
    quality: 90,
  },
};

export function resolveSanityImage(
  image: CmsImage | null | undefined,

  options: ResolveSanityImageOptions = {},
): string | undefined {
  if (!image?.asset?._ref) {
    return undefined;
  }

  /*
   * The complete Sanity image object is intentionally
   * passed to the URL builder.
   *
   * Passing only asset._ref or asset->url discards
   * the editor-authored crop/hotspot intent.
   */
  let builder = imageBuilder
    .image(image)
    .auto("format")
    .quality(options.quality ?? 85);

  if (options.width) {
    builder = builder.width(options.width);
  }

  if (options.height) {
    builder = builder.height(options.height);
  }

  /*
   * Both dimensions define a target aspect ratio.
   * Sanity can then use the hotspot as the focal area
   * for the generated crop.
   */
  if (options.width && options.height) {
    builder = builder.fit("crop");
  }

  return builder.url();
}

export function resolveSanityImagePreset(
  image: CmsImage | null | undefined,

  preset: SanityImagePreset,
): string | undefined {
  return resolveSanityImage(image, IMAGE_PRESETS[preset]);
}
