import type { CmsBlock, CmsImage } from "@/cms/types";

import { resolveSanityImagePreset } from "@/cms/resolvers/image";

import { sanityFetch } from "@/sanity/fetch";

import type { Page } from "@/sanity/types";

import {
  ACCORDION_BLOCK_FRAGMENT,
  CAROUSEL_BLOCK_FRAGMENT,
  CONTENT_BLOCK_FRAGMENT,
  HERO_BLOCK_FRAGMENT,
  TABS_BLOCK_FRAGMENT,
  FORM_BLOCK_FRAGMENT,
  GRID_BLOCK_FRAGMENT,
  DOCUMENT_LIST_BLOCK_FRAGMENT,
  RICH_TEXT_BLOCK_FRAGMENT,
  SINGLETON_REFERENCE_BLOCK_FRAGMENT,
} from "@/sanity/fragments";

import { IMAGE_FRAGMENT } from "@/sanity/fragments/image";

type PageLookup = {
  _id: string;
};

type PageQueryRecord = Omit<Page, "seo"> & {
  seo?: Omit<NonNullable<Page["seo"]>, "socialImageUrl" | "socialImageAlt"> & {
    socialImage?: CmsImage;
  };

  sections?: CmsBlock[];
};

export type ResolvedPage = Page & {
  sections?: CmsBlock[];
};

const HOMEPAGE_QUERY = `
  *[
    _type == "page" &&
    site._ref == $siteId &&
    locale == $locale &&
    isHomepage == true
  ][0]{
    _id
  }
`;

const ROOT_PAGE_QUERY = `
  *[
    _type == "page" &&
    site._ref == $siteId &&
    locale == $locale &&
    slug == $slug &&
    !defined(parent) &&
    isHomepage != true
  ][0]{
    _id
  }
`;

const CHILD_PAGE_QUERY = `
  *[
    _type == "page" &&
    site._ref == $siteId &&
    locale == $locale &&
    slug == $slug &&
    parent._ref == $parentId
  ][0]{
    _id
  }
`;

export const PAGE_BY_ID_QUERY = `
  *[
    _type == "page" &&
    _id == $pageId &&
    site._ref == $siteId &&
    locale == $locale
  ][0] {
    _id,
    title,
    slug,
    locale,
    isHomepage,

    parent {
      _ref
    },

    navigation {
      mode,

      navigationSet {
        _ref
      }
    },

    seo {
      metaTitle,
      metaDescription,

      socialImage {
        ${IMAGE_FRAGMENT}
      },

      canonicalUrl,

      indexing,
      following
    },

    sections[] {
      _key,
      _type,

      ${HERO_BLOCK_FRAGMENT},

      ${CAROUSEL_BLOCK_FRAGMENT},

      ${ACCORDION_BLOCK_FRAGMENT},

      ${CONTENT_BLOCK_FRAGMENT},

      ${TABS_BLOCK_FRAGMENT},

      ${FORM_BLOCK_FRAGMENT},

      ${GRID_BLOCK_FRAGMENT},

      ${DOCUMENT_LIST_BLOCK_FRAGMENT},

      ${RICH_TEXT_BLOCK_FRAGMENT},

      ${SINGLETON_REFERENCE_BLOCK_FRAGMENT}
    }
  }
`;

async function getPageById(
  pageId: string,
  siteId: string,
  locale: string,
  visualEditing = false,
): Promise<ResolvedPage | null> {
  const record = await sanityFetch<PageQueryRecord | null>(
    PAGE_BY_ID_QUERY,
    {
      pageId,
      siteId,
      locale,
    },
    { visualEditing },
  );

  if (!record) {
    return null;
  }

  const { seo, ...page } = record;

  return {
    ...page,

    seo: seo
      ? {
          ...seo,

          socialImageUrl: resolveSanityImagePreset(seo.socialImage, "social"),

          socialImageAlt: seo.socialImage?.alt ?? "",
        }
      : undefined,
  };
}

type PageRouteLookup = {
  _id: string;
  slug?: string;
  isHomepage?: boolean;

  parent?: {
    _ref?: string;
  };
};

const PAGE_ROUTE_BY_ID_QUERY = `
  *[
    _type == "page" &&
    _id == $pageId
  ][0]{
    _id,
    slug,
    isHomepage,

    parent {
      _ref
    }
  }
`;

async function getPageRouteById(
  pageId: string,
): Promise<PageRouteLookup | null> {
  return sanityFetch<PageRouteLookup | null>(PAGE_ROUTE_BY_ID_QUERY, {
    pageId,
  });
}

/**
 * Resolve only the published Page document ID for a route.
 *
 * This intentionally avoids fetching the Page Builder sections and is used
 * by translation / routing checks where we only need to know whether an
 * equivalent Page exists.
 */
export async function resolvePageIdBySegments(
  siteId: string,
  locale: string,
  segments: string[],
): Promise<string | null> {
  if (segments.length === 0) {
    const homepage = await sanityFetch<PageLookup | null>(HOMEPAGE_QUERY, {
      siteId,
      locale,
    });

    return homepage?._id ?? null;
  }

  const rootPage = await sanityFetch<PageLookup | null>(ROOT_PAGE_QUERY, {
    siteId,
    locale,
    slug: segments[0],
  });

  if (!rootPage) {
    return null;
  }

  let currentPageId = rootPage._id;

  for (const slug of segments.slice(1)) {
    const childPage = await sanityFetch<PageLookup | null>(CHILD_PAGE_QUERY, {
      siteId,
      locale,
      slug,
      parentId: currentPageId,
    });

    if (!childPage) {
      return null;
    }

    currentPageId = childPage._id;
  }

  return currentPageId;
}

/**
 * Reconstruct the relative Page route from a published Page document.
 *
 * Example:
 *   Products -> Widget
 * becomes:
 *   ["products", "widget"]
 *
 * The homepage returns an empty array.
 */
export async function resolvePageSegmentsById(
  pageId: string,
): Promise<string[] | null> {
  const page = await getPageRouteById(pageId);

  if (!page) {
    return null;
  }

  if (page.isHomepage === true) {
    return [];
  }

  if (!page.slug) {
    return null;
  }

  const segments = [page.slug];

  let parentId = page.parent?._ref;

  const visited = new Set<string>();

  let depth = 0;

  while (parentId && depth < 50) {
    if (visited.has(parentId)) {
      return null;
    }

    visited.add(parentId);

    const parent = await getPageRouteById(parentId);

    if (!parent || !parent.slug) {
      return null;
    }

    segments.unshift(parent.slug);

    parentId = parent.parent?._ref;
    depth++;
  }

  if (depth >= 50) {
    return null;
  }

  return segments;
}

export async function resolvePageBySegments(
  siteId: string,
  locale: string,
  segments: string[],
  options: { visualEditing?: boolean } = {},
): Promise<ResolvedPage | null> {
  const pageId = await resolvePageIdBySegments(siteId, locale, segments);

  if (!pageId) {
    return null;
  }

  return getPageById(pageId, siteId, locale, options.visualEditing === true);
}
