import type {
  TabItem,
  TabsBlockProps,
} from "mino-ui/blocks/TabsBlock";

import type {
  CmsTabsBlock,
  CmsTabsItem,
} from "@/cms/types";

import {
  CmsRichText,
} from "@/components/CmsRichText";

import {
  mapCtas,
} from "@/cms/mappers/cta";

import {
  mapSectionHeading,
} from "@/cms/mappers/section-heading";

import {
  resolveSanityImage,
} from "@/cms/resolvers/image";

async function mapTabsItem(
  item: CmsTabsItem,
): Promise<TabItem> {
  const ctas =
    await mapCtas(
      item.ctas,
    );

  const imageSrc =
    item.mediaType ===
    "image"
      ? resolveSanityImage(
          item.image,
        )
      : undefined;

  const videoSrc =
    item.mediaType ===
    "video"
      ? item.videoUrl
      : undefined;

  return {
    id: item._key,

    label: item.label,

    badge:
      item.badge,

    content:
      item.content?.length
        ? (
            <CmsRichText
              value={
                item.content
              }
              mode="block"
            />
          )
        : undefined,

    imageSrc,

    imageAlt:
      item.image?.alt ??
      "",

    videoSrc,

    ctas,

    ctaGroupProps: {
      stackOnMobile:
        item.ctaStackOnMobile ??
        true,
    },
  };
}

async function mapTabsItems(
  items:
    | CmsTabsItem[]
    | undefined,
): Promise<TabItem[]> {
  if (!items?.length) {
    return [];
  }

  return Promise.all(
    items.map(
      mapTabsItem,
    ),
  );
}

export async function mapTabsBlock(
  block: CmsTabsBlock,
): Promise<TabsBlockProps> {
  const heading =
    mapSectionHeading(
      block.heading,
    );

  const items =
    await mapTabsItems(
      block.items,
    );

  const defaultItem =
    block.items?.find(
      (item) =>
        item.defaultActive,
    );

  return {
    ...heading,

    alignment:
      block.alignment ??
      "left",

    /*
     * Horizontal is the only variant
     * confirmed by the uploaded block.
     */
    variant:
      "horizontal",

    defaultActiveId:
      defaultItem?._key ??
      block.items?.[0]
        ?._key,

    items,
  };
}