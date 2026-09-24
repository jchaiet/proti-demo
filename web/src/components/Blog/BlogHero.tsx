"use client";

import { HeroBlock } from "mino-ui/blocks/HeroBlock";

import type { CmsTaxonomyTerm } from "@/cms/types";

export interface BlogHeroProps {
  title: string;
  summary?: string;
  publishedDate?: string;
  imageUrl?: string;
  imageAlt?: string;

  authorName?: string;
  authorHref?: string;

  taxonomy?: CmsTaxonomyTerm[];

  /**
   * Empty for the default locale.
   *
   * Example:
   * /us-es
   */
  localePrefix?: string;
}

function normalizePrefix(prefix?: string): string {
  if (!prefix) {
    return "";
  }

  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`;

  return normalized.replace(/\/+$/, "");
}

function getTaxonomySearchHref(
  title: string | undefined,
  localePrefix?: string,
): string | undefined {
  const query = title?.trim().toLowerCase();

  if (!query) {
    return undefined;
  }

  const prefix = normalizePrefix(localePrefix);

  return `${prefix}/search?q=${encodeURIComponent(query)}`;
}

export function BlogHero({
  title,
  summary,
  publishedDate,
  imageUrl,
  imageAlt = "",
  authorName,
  authorHref,
  taxonomy = [],
  localePrefix,
}: BlogHeroProps) {
  const categories = taxonomy
    .filter((term) => Boolean(term.title))
    .map((term) => ({
      id: term._id,
      label: term.title,
      href: getTaxonomySearchHref(term.title, localePrefix),
    }));

  return (
    <HeroBlock
      layout="blog"
      hAlignment="left"
      vAlignment="bottom"
      eyebrow={publishedDate}
      title={title}
      description={summary}
      imageSrc={imageUrl}
      imageAlt={imageAlt}
      categories={categories}
      byline={
        authorName ? (
          <>
            By {authorHref ? <a href={authorHref}>{authorName}</a> : authorName}
          </>
        ) : undefined
      }
    />
  );
}
