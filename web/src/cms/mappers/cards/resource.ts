import type { ResourceCardProps } from "mino-ui/cards/ResourceCard";

import type { CmsResourceCard } from "@/cms/types";

import { resolveSanityImage } from "@/cms/resolvers/image";

import { resolveLink } from "@/cms/resolvers/link";

export async function mapResourceCard(
  card: CmsResourceCard,
): Promise<ResourceCardProps> {
  const resolvedLink = card.link ? await resolveLink(card.link) : undefined;

  return {
    title: card.title,

    summary: card.summary,

    href: resolvedLink?.href,

    imageUrl: resolveSanityImage(card.image),

    imageAlt: card.image?.alt ?? "",

    fileType: card.fileType,

    fileSize: card.fileSize,

    tags: card.tags ?? [],

    actionLabel: card.actionLabel ?? "Download",
  };
}
