import type {
  GridBlockItemConfig,
  GridBlockProps,
} from "mino-ui/blocks/GridBlock";

import type { CmsGridBlock, CmsGridItem } from "@/cms/types";

import { mapSectionHeading } from "@/cms/mappers/section-heading";

import {
  mapArticleCard,
  mapFullBleedCard,
  mapResourceCard,
  mapTestimonialCard,
} from "@/cms/mappers/cards";

import { resolveSanityImage } from "@/cms/resolvers/image";

import { resolveLink } from "@/cms/resolvers/link";

async function mapGridItem(
  item: CmsGridItem,
): Promise<GridBlockItemConfig | null> {
  switch (item._type) {
    case "gridImageItem": {
      const imageSrc = resolveSanityImage(item.image);

      if (!imageSrc) {
        return null;
      }

      const link = item.link ? await resolveLink(item.link) : undefined;

      return {
        id: item._key,

        type: "image",

        imageSrc,

        imageAlt: item.image?.alt ?? "",

        href: link?.href,

        target: link?.target,

        rel: link?.rel,
      };
    }

    case "articleCard": {
      const article = await mapArticleCard(item);

      if (!article) {
        return null;
      }

      return {
        id: item._key,

        type: "article",

        article,
      };
    }

    case "resourceCard": {
      const resource = await mapResourceCard(item);

      if (!resource) {
        return null;
      }

      return {
        id: item._key,

        type: "resource",

        resource,
      };
    }

    case "testimonialCard": {
      const testimonial = await mapTestimonialCard(item);

      if (!testimonial) {
        return null;
      }

      return {
        id: item._key,

        type: "testimonial",

        testimonial,
      };
    }

    case "fullBleedCard": {
      const fullBleed = await mapFullBleedCard(item);

      if (!fullBleed) {
        return null;
      }

      return {
        id: item._key,

        type: "fullBleed",

        fullBleed,
      };
    }

    default:
      return null;
  }
}

async function mapGridItems(
  items: CmsGridItem[] | undefined,
): Promise<GridBlockItemConfig[]> {
  if (!items?.length) {
    return [];
  }

  const mapped = await Promise.all(items.map(mapGridItem));

  return mapped.filter((item): item is GridBlockItemConfig => item !== null);
}

export async function mapGridBlock(
  block: CmsGridBlock,
): Promise<GridBlockProps> {
  const heading = mapSectionHeading(block.heading);

  const cols = (block.cols ?? 3) as GridBlockProps["cols"];

  return {
    ...heading,

    blockLayout: block.blockLayout ?? "stacked",

    alignment: block.alignment ?? "left",

    gridPosition: block.gridPosition ?? "right",

    cols,

    items: await mapGridItems(block.items),

    grayscaleImages: block.grayscaleImages ?? false,

    imageSrc: resolveSanityImage(block.sideImage),

    imageAlt: block.sideImage?.alt ?? "",
  };
}
