import type { FullBleedCardProps } from "mino-ui/cards/FullBleedCard";

import type { CmsFullBleedCard } from "@/cms/types";

import { resolveSanityImage } from "@/cms/resolvers/image";

import { resolveLink } from "@/cms/resolvers/link";

export async function mapFullBleedCard(
  card: CmsFullBleedCard,
): Promise<FullBleedCardProps | null> {
  const imageSrc = resolveSanityImage(card.image);

  if (!imageSrc) {
    return null;
  }

  const link = card.link ? await resolveLink(card.link) : undefined;

  return {
    imageSrc,

    imageAlt: card.image?.alt ?? "",

    title: card.title,

    description: card.description ?? undefined,

    href: link?.href,

    target: link?.target,

    rel: link?.rel,

    expandable: card.expandable ?? false,
  };
}
