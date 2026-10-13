"use client";

import { HeroBlock } from "mino-ui/blocks/HeroBlock";

import type { CmsTaxonomyTerm } from "@/cms/types";

export interface BlogHeroProps {
  title: string;
  summary?: string;
  showSummary?: boolean;
  publishedDate?: string;
  publishedDateTime?: string;
  imageUrl?: string;
  imageAlt?: string;

  authorName?: string;
  authorHref?: string;
  bylineLabel?: string;

  taxonomy?: CmsTaxonomyTerm[] | null;

  /**
   * Empty for the default locale.
   *
   * Example:
   * /es-us
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
  showSummary = false,
  publishedDate,
  publishedDateTime,
  imageUrl,
  imageAlt = "",
  authorName,
  authorHref,
  bylineLabel = "By",
  taxonomy,
  localePrefix,
}: BlogHeroProps) {
  const categories = (taxonomy ?? [])
    .filter((term) => Boolean(term.title))
    .map((term) => ({
      id: term._id,
      label: term.title,
      href: getTaxonomySearchHref(term.title, localePrefix),
    }));

  const publishedEyebrow =
    publishedDate && publishedDateTime ? (
      <time dateTime={publishedDateTime}>{publishedDate}</time>
    ) : (
      publishedDate
    );

  return (
    <HeroBlock
      layout="blog"
      hAlignment="left"
      vAlignment="bottom"
      eyebrow={publishedEyebrow}
      title={title}
      headingProps={{
        level: 1,
      }}
      description={showSummary ? summary : undefined}
      imageSrc={imageUrl}
      imageAlt={imageAlt}
      categories={categories}
      byline={
        authorName ? (
          <>
            {bylineLabel}{" "}
            {authorHref ? <a href={authorHref}>{authorName}</a> : authorName}
          </>
        ) : undefined
      }
    />
  );
}
