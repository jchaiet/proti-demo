import type { ArticleCardProps } from "mino-ui/cards/ArticleCard";

import type { CmsArticleCard } from "@/cms/types";

import { resolveSanityImage } from "@/cms/resolvers/image";

import { resolveLink } from "@/cms/resolvers/link";

export async function mapArticleCard(
  card: CmsArticleCard,
): Promise<ArticleCardProps> {
  const resolvedLink = card.link ? await resolveLink(card.link) : undefined;

  const imageUrl = resolveSanityImage(card.image);

  const avatarUrl = resolveSanityImage(card.author?.avatar);

  return {
    title: card.title,

    summary: card.summary,

    href: resolvedLink?.href,

    imageUrl,

    imageAlt: card.image?.alt ?? "",

    category: card.category,

    publishedAt: card.publishedAt,

    readTime: card.readTime,

    author: card.author?.name
      ? {
          name: card.author.name,

          role: card.author.role,

          avatarUrl,
        }
      : undefined,

    orientation: card.orientation ?? "vertical",

    isExternal: resolvedLink?.target === "_blank",
  };
}
