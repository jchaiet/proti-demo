import type { DocumentItem } from "mino-ui/blocks/DocumentListBlock";

import type {
  CmsDocumentListDynamicContentType,
  CmsDocumentListDynamicSort,
  CmsDocumentListTaxonomyMatchLogic,
  CmsDynamicDocumentListItem,
} from "@/cms/types";

import { resolveSanityImagePreset } from "@/cms/resolvers/image";

import { sanityFetch } from "@/sanity/fetch";

import { getDynamicDocumentListQuery } from "@/sanity/queries/documentList";

const SANITY_DOCUMENT_TYPES: Record<CmsDocumentListDynamicContentType, string> =
  {
    article: "article",
    blog: "blog",
    news: "news",
    resource: "resource",
  };

const CONTENT_ROUTE_PREFIXES: Record<
  CmsDocumentListDynamicContentType,
  string
> = {
  article: "articles",
  blog: "blog",
  news: "news",
  resource: "resources",
};

export interface ResolveDynamicDocumentListOptions {
  siteId: string;

  locale: string;

  localePrefix?: string;

  contentTypes: CmsDocumentListDynamicContentType[];

  /**
   * Clean published Taxonomy document IDs.
   */
  taxonomyIds?: string[];

  taxonomyMatchLogic?: CmsDocumentListTaxonomyMatchLogic;

  sort: CmsDocumentListDynamicSort;

  limit: number;

  visualEditing?: boolean;
}

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, "") ?? "";
}

function normalizePath(path: string): string {
  if (!path) {
    return "";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeLocalePrefix(prefix?: string): string {
  if (!prefix) {
    return "";
  }

  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`;

  return normalized.replace(/\/+$/, "");
}

function applyLocalePrefix(path: string, localePrefix?: string): string {
  const normalizedPath = normalizePath(path);
  const normalizedPrefix = normalizeLocalePrefix(localePrefix);

  if (!normalizedPath || !normalizedPrefix) {
    return normalizedPath;
  }

  if (
    normalizedPath === normalizedPrefix ||
    normalizedPath.startsWith(`${normalizedPrefix}/`)
  ) {
    return normalizedPath;
  }

  return `${normalizedPrefix}${normalizedPath}`;
}

function resolveDynamicHref(
  item: CmsDynamicDocumentListItem,
  localePrefix?: string,
): string {
  if (item.path) {
    return applyLocalePrefix(item.path, localePrefix);
  }

  if (!item.slug) {
    return "";
  }

  const routePrefix = CONTENT_ROUTE_PREFIXES[item._type];

  return applyLocalePrefix(`/${routePrefix}/${item.slug}`, localePrefix);
}

function mapDynamicItem(
  item: CmsDynamicDocumentListItem,
  localePrefix?: string,
): DocumentItem | null {
  if (!item.title) {
    return null;
  }

  const isResource = item._type === "resource";

  return {
    id: item._id,

    contentType: item._type,

    cardType: isResource ? "resource" : "article",

    title: item.title,

    summary: item.summary,

    url: resolveDynamicHref(item, localePrefix),

    date: item.date,

    thumbnail: resolveSanityImagePreset(item.thumbnailImage, "card"),

    tags: item.taxonomy?.map((term) => term.title).filter(Boolean),

    fileType: item.fileType,

    fileSize: item.fileSize,
  };
}

export async function resolveDynamicDocumentList(
  options: ResolveDynamicDocumentListOptions,
): Promise<DocumentItem[]> {
  const {
    siteId,
    locale,
    localePrefix,
    contentTypes,
    taxonomyIds = [],
    taxonomyMatchLogic = "any",
    sort,
    limit,
    visualEditing = false,
  } = options;

  if (!siteId || !locale || !contentTypes.length) {
    return [];
  }

  const safeLimit = Math.min(Math.max(limit, 1), 200);

  const sanityTypes = contentTypes.map((type) => SANITY_DOCUMENT_TYPES[type]);

  const normalizedTaxonomyIds = Array.from(
    new Set(taxonomyIds.map(cleanId).filter(Boolean)),
  );

  const query = getDynamicDocumentListQuery(sort);

  const results = await sanityFetch<CmsDynamicDocumentListItem[]>(
    query,
    {
      siteId,
      locale,

      types: sanityTypes,

      taxonomyIds: normalizedTaxonomyIds,

      taxonomyMatchLogic: taxonomyMatchLogic === "all" ? "all" : "any",

      limit: safeLimit,
    },
    { visualEditing },
  );

  return results
    .map((item) => mapDynamicItem(item, localePrefix))
    .filter((item): item is DocumentItem => item !== null);
}
