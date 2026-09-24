import type {
  CarouselBlockItemConfig,
  CarouselBlockProps,
} from "mino-ui/blocks/CarouselBlock";

import type { CmsCarouselBlock, CmsCarouselItem } from "@/cms/types";

import { mapCtas } from "@/cms/mappers/cta";

import {
  mapArticleCard,
  mapFullBleedCard,
  mapResourceCard,
  mapTestimonialCard,
} from "@/cms/mappers/cards";

import { mapSectionHeading } from "@/cms/mappers/section-heading";

import { resolveSanityImage } from "@/cms/resolvers/image";

import { resolveLink } from "@/cms/resolvers/link";

async function mapCarouselItem(
  item: CmsCarouselItem,
): Promise<CarouselBlockItemConfig | null> {
  switch (item._type) {
    case "carouselImageItem": {
      const imageSrc = resolveSanityImage(item.image);

      if (!imageSrc) {
        return null;
      }

      const resolvedLink = item.link ? await resolveLink(item.link) : undefined;

      return {
        id: item._key,

        type: "image",

        imageSrc,

        imageAlt: item.image?.alt ?? "",

        href: resolvedLink?.href,

        target: resolvedLink?.target,

        rel: resolvedLink?.rel,
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

async function mapCarouselItems(
  items: CmsCarouselItem[] | undefined,
): Promise<CarouselBlockItemConfig[]> {
  if (!items?.length) {
    return [];
  }

  const mapped = await Promise.all(items.map(mapCarouselItem));

  return mapped.filter(
    (item): item is CarouselBlockItemConfig => item !== null,
  );
}

export async function mapCarouselBlock(
  block: CmsCarouselBlock,
): Promise<CarouselBlockProps> {
  const [ctas, items] = await Promise.all([
    mapCtas(block.ctas),

    mapCarouselItems(block.items),
  ]);

  const heading = mapSectionHeading(block.heading);

  return {
    ...heading,

    layout: block.layout ?? "default",

    alignment: block.alignment ?? "left",

    mediaPosition: block.mediaPosition ?? "right",

    ctas,

    ctaGroupProps: {
      stackOnMobile: block.ctaStackOnMobile ?? true,
    },

    items,

    carouselProps: {
      itemsPerPage: block.itemsPerPage ?? 3,

      itemsPerRow: block.itemsPerRow,

      autoPlay: block.autoPlay ?? false,

      autoPlayInterval: block.autoPlayInterval ?? 4000,

      mobilePeek: block.mobilePeek ?? true,

      grayscaleImages: block.grayscaleImages ?? false,
    },
  };
}
