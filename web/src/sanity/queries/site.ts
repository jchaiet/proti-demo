import { cache } from "react";
import { unstable_cache } from "next/cache";

import { sanityClient } from "@/sanity/client";
import { PUBLIC_SEARCH_SITE_LOOKUP_TAG } from "@/sanity/cache-tags";

import { sanityFetch } from "@/sanity/fetch";
import type { Site } from "@/sanity/types";

const SITE_BY_DOMAIN_QUERY = `
  *[
    _type == "site" &&
    (
      $host in domains ||
      $hostname in domains
    )
  ][0]{
    _id,
    name,
    key,
    domains,
    canonicalDomain,
    defaultLocale,
    locales[]{
      code,
      label
    }
  }
`;

function normalizeHost(host: string): string {
  return host
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function removePort(host: string): string {
  /*
   * localhost:3000 -> localhost
   * company.com     -> company.com
   */
  return host.replace(/:\d+$/, "");
}

export async function resolveSiteByHost(
  requestHost: string,
): Promise<Site | null> {
  const host = normalizeHost(requestHost);
  const hostname = removePort(host);

  return sanityFetch<Site | null>(SITE_BY_DOMAIN_QUERY, {
    host,
    hostname,
  });
}

/**
 * Search runs in a force-dynamic Route Handler, so ordinary React cache()
 * cannot persist Host -> Site resolution between independent requests.
 *
 * Cache only the published Site configuration, never search results, user
 * input, draft content, or locale-specific search documents. The short TTL
 * is a fallback if the signed Sanity publish webhook is unavailable.
 *
 * Use the same published GROQ projection and host normalization as the
 * existing resolveSiteByHost() function. The outer Next Data Cache is tagged
 * so Site create/update/delete webhooks expire entries immediately.
 */
const SEARCH_SITE_CACHE_SECONDS = 60;

const resolvePublishedSiteForSearch = unstable_cache(
  async (host: string, hostname: string): Promise<Site | null> =>
    sanityClient.fetch<Site | null>(
      SITE_BY_DOMAIN_QUERY,
      { host, hostname },
      // The outer cache owns the TTL. Refill it from fresh published content.
      { next: { revalidate: 0 } },
    ),
  ["proti-public-search-site-lookup-v1"],
  {
    tags: [PUBLIC_SEARCH_SITE_LOOKUP_TAG],
    revalidate: SEARCH_SITE_CACHE_SECONDS,
  },
);

/**
 * Host resolution for the public Search API only.
 *
 * Development and draft/preview requests keep the existing uncached path,
 * preserving immediate editorial updates and draft-mode behavior.
 * The host is passed as a cache argument, isolating different Sites/domains.
 */
export async function resolveSearchSiteByHost(
  requestHost: string,
): Promise<Site | null> {
  if (process.env.NODE_ENV === "development") {
    return resolveSiteByHost(requestHost);
  }

  try {
    const { draftMode } = await import("next/headers");
    if ((await draftMode()).isEnabled) {
      return resolveSiteByHost(requestHost);
    }
  } catch {
    // A request store is not present during some test/tool executions.
  }

  const host = normalizeHost(requestHost);
  return resolvePublishedSiteForSearch(host, removePort(host));
}

/**
 * React-render-only memoized Site lookup.
 *
 * Use this from Layouts, Pages, and generateMetadata so repeated host
 * resolution within the same render does not issue duplicate CMS requests.
 * Most Route Handlers can continue using resolveSiteByHost directly;
 * the public Search API uses its separate, published-only Data Cache.
 */
export const resolveSiteByHostCached = cache(resolveSiteByHost);

export interface ResolvedSiteLocale {
  code: string;
  label?: string;
}

export interface ResolvedSiteLocaleConfig {
  defaultLocale: string;

  locales: ResolvedSiteLocale[];

  /**
   * Locale codes that currently have a published CMS Homepage.
   *
   * This lets the language switcher distinguish between:
   * - an exact translated route
   * - a valid locale-homepage fallback
   * - no valid destination
   */
  homepageLocales: string[];
}

const SITE_LOCALES_BY_ID_QUERY = `
  *[
    _type == "site" &&
    _id == $siteId
  ][0]{
    defaultLocale,

    locales[]{
      code,
      label
    },

    "homepageLocales": *[
      _type == "page" &&
      site._ref == ^._id &&
      isHomepage == true &&
      defined(locale)
    ].locale
  }
`;

export async function resolveSiteLocales(
  siteId: string,
): Promise<ResolvedSiteLocaleConfig | null> {
  if (!siteId) {
    return null;
  }

  return sanityFetch<ResolvedSiteLocaleConfig | null>(
    SITE_LOCALES_BY_ID_QUERY,
    {
      siteId,
    },
  );
}
