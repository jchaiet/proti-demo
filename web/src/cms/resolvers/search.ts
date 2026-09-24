import type { CmsImage } from "@/cms/types";

import type {
  SearchContentOptions,
  SearchContentType,
  SearchResponse,
  SearchResult,
  SearchSort,
  SearchTaxonomyItem,
  SearchTaxonomyMatch,
} from "@/cms/types/search";

import { resolveSanityImagePreset } from "@/cms/resolvers/image";
import { extractVisibleText } from "@/cms/search/visible-text";

import { sanityFetch } from "@/sanity/fetch";

import {
  SEARCH_CONTENT_QUERY,
  SEARCH_SITE_SETTINGS_QUERY,
  SEARCH_TAXONOMY_QUERY,
} from "@/sanity/queries/search";

type SearchIndexing = "inherit" | "index" | "noindex";

interface RawSeo {
  indexing?: SearchIndexing;
  canonicalUrl?: string;
}

interface RawAuthor {
  _id?: string;
  name?: string;
  jobTitle?: string;
}

interface RawTaxonomy {
  _id: string;
  title?: string;
  slug?: string;
  parentId?: string;
}

interface RawSearchDocument {
  _id: string;
  _type: "page" | "blog";

  _updatedAt?: string;

  title?: string;
  locale?: string;

  seo?: RawSeo;

  /*
   * Page fields.
   */
  slug?: string;
  isHomepage?: boolean;
  parentId?: string;

  /*
   * Blog fields.
   */
  summary?: string;
  publishedAt?: string;

  image?: CmsImage;

  author?: RawAuthor;

  taxonomy?: RawTaxonomy[];

  sections?: unknown[];
}

interface SearchSiteSettings {
  _id: string;

  name?: string;

  domains?: string[];

  defaultLocale: string;

  defaultIndexing?: "index" | "noindex";
}

interface IndexedDocument {
  result: SearchResult;

  score: number;

  searchableText: string;

  titleText: string;
  summaryText: string;
  bodyText: string;
  authorText: string;
  taxonomyText: string;

  sortDate?: string;
}

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, "") ?? "";
}

function normalizeText(value?: string): string {
  return (
    value?.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase() ??
    ""
  );
}

function tokenizeQuery(query: string): string[] {
  return normalizeText(query)
    .split(/[\s.,/#!$%^&*;:{}=\-_`~()?[\]"'<>|\\]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeDomain(value?: string): string | null {
  if (!value) {
    return null;
  }

  const domain = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  return domain || null;
}

function getSiteOrigin(site: SearchSiteSettings): string | null {
  const domain = normalizeDomain(site.domains?.[0]);

  if (!domain) {
    return null;
  }

  const isLocal =
    domain.startsWith("localhost") ||
    domain.startsWith("127.0.0.1") ||
    domain.startsWith("[::1]");

  return `${isLocal ? "http" : "https"}://${domain}`;
}

function getLocalePrefix(site: SearchSiteSettings, locale: string): string {
  return locale === site.defaultLocale ? "" : `/${locale}`;
}

function joinPublicPath(localePrefix: string, routePath: string): string {
  const path = routePath.startsWith("/") ? routePath : `/${routePath}`;

  if (!localePrefix) {
    return path;
  }

  if (path === "/") {
    return localePrefix;
  }

  return `${localePrefix}${path}`;
}

function buildPagePath(
  page: RawSearchDocument,
  pagesById: Map<string, RawSearchDocument>,
): string | null {
  if (page.isHomepage) {
    return "/";
  }

  const segments: string[] = [];
  const visited = new Set<string>();

  let current: RawSearchDocument | undefined = page;

  while (current) {
    const id = cleanId(current._id);

    if (!id || visited.has(id)) {
      return null;
    }

    visited.add(id);

    if (!current.isHomepage) {
      if (!current.slug) {
        return null;
      }

      segments.unshift(current.slug);
    }

    const parentId = cleanId(current.parentId);

    if (!parentId) {
      break;
    }

    current = pagesById.get(parentId);

    if (!current) {
      return null;
    }
  }

  return `/${segments.join("/")}`;
}

function buildTaxonomyPath(
  item: RawTaxonomy,
  taxonomyById: Map<string, RawTaxonomy>,
): string | null {
  const segments: string[] = [];

  const visited = new Set<string>();

  let current: RawTaxonomy | undefined = item;

  while (current) {
    const id = cleanId(current._id);

    if (!id || visited.has(id) || !current.slug) {
      return null;
    }

    visited.add(id);

    segments.unshift(current.slug);

    const parentId = cleanId(current.parentId);

    if (!parentId) {
      break;
    }

    current = taxonomyById.get(parentId);

    if (!current) {
      return null;
    }
  }

  return segments.join("/");
}

function isIndexable(
  document: RawSearchDocument,
  site: SearchSiteSettings,
): boolean {
  const override = document.seo?.indexing;

  if (override === "index") {
    return true;
  }

  if (override === "noindex") {
    return false;
  }

  return (site.defaultIndexing ?? "index") === "index";
}

function normalizeUrlForCompare(value: URL): string {
  value.hash = "";

  if (value.pathname.length > 1) {
    value.pathname = value.pathname.replace(/\/+$/, "");
  }

  return value.toString();
}

function isCanonicalPublicUrl({
  canonicalUrl,
  publicPath,
  origin,
}: {
  canonicalUrl?: string;
  publicPath: string;
  origin: string | null;
}): boolean {
  if (!canonicalUrl?.trim()) {
    return true;
  }

  if (!origin) {
    /*
     * Without a canonical origin we cannot safely prove
     * this URL is the canonical copy. Exclude it.
     */
    return false;
  }

  try {
    const current = new URL(publicPath, `${origin}/`);

    const canonical = new URL(canonicalUrl, current);

    return (
      normalizeUrlForCompare(canonical) === normalizeUrlForCompare(current)
    );
  } catch {
    return false;
  }
}

function getSnippet(
  body: string,
  query: string,
  fallback?: string,
): string | undefined {
  const source = body.trim() || fallback?.trim();

  if (!source) {
    return undefined;
  }

  const normalizedSource = normalizeText(source);

  const normalizedQuery = normalizeText(query);

  let start = 0;

  if (normalizedQuery) {
    const matchIndex = normalizedSource.indexOf(normalizedQuery);

    if (matchIndex >= 0) {
      start = Math.max(0, matchIndex - 70);
    }
  }

  const maxLength = 220;

  let snippet = source.slice(start, start + maxLength);

  if (start > 0) {
    snippet = `…${snippet}`;
  }

  if (start + maxLength < source.length) {
    snippet = `${snippet}…`;
  }

  return snippet.trim();
}

function buildScore({
  query,
  tokens,

  title,
  summary,
  body,
  author,
  taxonomy,
}: {
  query: string;
  tokens: string[];

  title: string;
  summary: string;
  body: string;
  author: string;
  taxonomy: string;
}): number {
  const normalizedQuery = normalizeText(query);

  let score = 0;

  if (title === normalizedQuery) {
    score += 120;
  } else if (normalizedQuery && title.includes(normalizedQuery)) {
    score += 60;
  }

  if (normalizedQuery && summary.includes(normalizedQuery)) {
    score += 30;
  }

  if (normalizedQuery && author.includes(normalizedQuery)) {
    score += 20;
  }

  if (normalizedQuery && taxonomy.includes(normalizedQuery)) {
    score += 16;
  }

  if (normalizedQuery && body.includes(normalizedQuery)) {
    score += 12;
  }

  for (const token of tokens) {
    if (title.includes(token)) {
      score += 12;
    }

    if (summary.includes(token)) {
      score += 6;
    }

    if (author.includes(token)) {
      score += 4;
    }

    if (taxonomy.includes(token)) {
      score += 3;
    }

    if (body.includes(token)) {
      score += 2;
    }
  }

  return score;
}

function matchesQuery(searchableText: string, tokens: string[]): boolean {
  if (tokens.length === 0) {
    return false;
  }

  /*
   * Require every query token to be present somewhere in
   * visible content. The words do not need to be in the
   * same field.
   */
  return tokens.every((token) => searchableText.includes(token));
}

function matchesTaxonomy({
  resultTaxonomy,
  requested,
  mode,
}: {
  resultTaxonomy: SearchTaxonomyItem[];

  requested: string[];

  mode: SearchTaxonomyMatch;
}): boolean {
  if (requested.length === 0) {
    return true;
  }

  const values = new Set(
    resultTaxonomy.flatMap((item) => [
      normalizeText(item.id),
      normalizeText(item.path),
    ]),
  );

  const normalizedRequested = requested.map(normalizeText).filter(Boolean);

  if (mode === "all") {
    return normalizedRequested.every((value) => values.has(value));
  }

  return normalizedRequested.some((value) => values.has(value));
}

function buildFacets(items: IndexedDocument[]): SearchResponse["facets"] {
  const typeCounts: Record<SearchContentType, number> = {
    page: 0,
    blog: 0,
  };

  const taxonomyCounts = new Map<
    string,
    {
      label: string;
      count: number;
    }
  >();

  for (const item of items) {
    typeCounts[item.result.type] += 1;

    for (const taxonomyItem of item.result.taxonomy ?? []) {
      const existing = taxonomyCounts.get(taxonomyItem.path);

      if (existing) {
        existing.count += 1;
      } else {
        taxonomyCounts.set(taxonomyItem.path, {
          label: taxonomyItem.title,
          count: 1,
        });
      }
    }
  }

  return {
    types: [
      {
        value: "page",
        label: "Pages",
        count: typeCounts.page,
      },
      {
        value: "blog",
        label: "Blog posts",
        count: typeCounts.blog,
      },
    ],

    taxonomy: Array.from(taxonomyCounts.entries())
      .map(([value, item]) => ({
        value,
        label: item.label,
        count: item.count,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, {
          sensitivity: "base",
        }),
      ),
  };
}

function compareDates(first?: string, second?: string): number {
  const firstTime = first ? Date.parse(first) : Number.NaN;

  const secondTime = second ? Date.parse(second) : Number.NaN;

  const firstValid = Number.isFinite(firstTime);

  const secondValid = Number.isFinite(secondTime);

  if (!firstValid && !secondValid) {
    return 0;
  }

  if (!firstValid) {
    return 1;
  }

  if (!secondValid) {
    return -1;
  }

  return secondTime - firstTime;
}

function sortResults(
  items: IndexedDocument[],
  sort: SearchSort,
): IndexedDocument[] {
  const sorted = [...items];

  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => compareDates(a.sortDate, b.sortDate));

    case "oldest":
      return sorted.sort((a, b) => -compareDates(a.sortDate, b.sortDate));

    case "title-asc":
      return sorted.sort((a, b) =>
        a.result.title.localeCompare(b.result.title, undefined, {
          sensitivity: "base",
        }),
      );

    case "title-desc":
      return sorted.sort((a, b) =>
        b.result.title.localeCompare(a.result.title, undefined, {
          sensitivity: "base",
        }),
      );

    case "relevance":
    default:
      return sorted.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return compareDates(a.sortDate, b.sortDate);
      });
  }
}

export async function searchContent(
  options: SearchContentOptions,
): Promise<SearchResponse> {
  const query = options.query.trim().slice(0, 200);

  const page = Math.max(1, options.page ?? 1);

  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 12));

  const sort = options.sort ?? "relevance";

  const types = options.types?.length
    ? Array.from(new Set(options.types))
    : (["page", "blog"] satisfies SearchContentType[]);

  const taxonomy = Array.from(
    new Set(
      (options.taxonomy ?? []).map((value) => value.trim()).filter(Boolean),
    ),
  );

  const taxonomyMatch = options.taxonomyMatch ?? "any";

  if (!query) {
    return {
      query,
      locale: options.locale,

      page,
      pageSize,

      total: 0,
      totalPages: 0,

      sort,

      filters: {
        types,
        taxonomy,
        taxonomyMatch,
      },

      facets: {
        types: [
          {
            value: "page",
            label: "Pages",
            count: 0,
          },
          {
            value: "blog",
            label: "Blog posts",
            count: 0,
          },
        ],
        taxonomy: [],
      },

      results: [],
    };
  }

  const [site, documents, taxonomyDocuments] = await Promise.all([
    sanityFetch<SearchSiteSettings | null>(
      SEARCH_SITE_SETTINGS_QUERY,
      {
        siteId: options.siteId,

        locale: options.locale,
      },
      { revalidate: 0 },
    ),

    sanityFetch<RawSearchDocument[]>(
      SEARCH_CONTENT_QUERY,
      {
        siteId: options.siteId,

        locale: options.locale,
      },
      { revalidate: 0 },
    ),

    sanityFetch<RawTaxonomy[]>(
      SEARCH_TAXONOMY_QUERY,
      {
        siteId: options.siteId,

        locale: options.locale,
      },
      { revalidate: 0 },
    ),
  ]);

  if (!site) {
    return {
      query,
      locale: options.locale,

      page,
      pageSize,

      total: 0,
      totalPages: 0,

      sort,

      filters: {
        types,
        taxonomy,
        taxonomyMatch,
      },

      facets: {
        types: [
          {
            value: "page",
            label: "Pages",
            count: 0,
          },
          {
            value: "blog",
            label: "Blog posts",
            count: 0,
          },
        ],
        taxonomy: [],
      },

      results: [],
    };
  }

  const origin = getSiteOrigin(site);

  const localePrefix = getLocalePrefix(site, options.locale);

  const pagesById = new Map(
    documents
      .filter((document) => document._type === "page")
      .map((document) => [cleanId(document._id), document]),
  );

  const taxonomyById = new Map(
    taxonomyDocuments.map((item) => [cleanId(item._id), item]),
  );

  const tokens = tokenizeQuery(query);

  const indexed: IndexedDocument[] = [];

  for (const document of documents) {
    if (!document.title || !isIndexable(document, site)) {
      continue;
    }

    let href: string | null = null;

    if (document._type === "page") {
      const pagePath = buildPagePath(document, pagesById);

      if (!pagePath) {
        continue;
      }

      href = joinPublicPath(localePrefix, pagePath);
    } else {
      if (!document.slug) {
        continue;
      }

      href = joinPublicPath(localePrefix, `/blog/${document.slug}`);
    }

    if (
      !isCanonicalPublicUrl({
        canonicalUrl: document.seo?.canonicalUrl,

        publicPath: href,

        origin,
      })
    ) {
      continue;
    }

    const bodyText = extractVisibleText(document.sections);

    const titleText = normalizeText(document.title);

    const summaryText = normalizeText(document.summary);

    const authorText = normalizeText(document.author?.name);

    const resultTaxonomy = (document.taxonomy ?? [])
      .map((item): SearchTaxonomyItem | null => {
        const path = buildTaxonomyPath(item, taxonomyById);

        if (!path || !item.title) {
          return null;
        }

        return {
          id: cleanId(item._id),

          title: item.title,

          path,
        };
      })
      .filter((item): item is SearchTaxonomyItem => item !== null);

    const taxonomyText = normalizeText(
      resultTaxonomy.map((item) => item.title).join(" "),
    );

    const searchableText = normalizeText(
      [
        document.title,
        document.summary,
        document.author?.name,
        resultTaxonomy.map((item) => item.title).join(" "),
        bodyText,
      ]
        .filter(Boolean)
        .join(" "),
    );

    if (!matchesQuery(searchableText, tokens)) {
      continue;
    }

    const score = buildScore({
      query,
      tokens,

      title: titleText,

      summary: summaryText,

      body: normalizeText(bodyText),

      author: authorText,

      taxonomy: taxonomyText,
    });

    const description =
      document._type === "blog"
        ? document.summary?.trim() || getSnippet(bodyText, query)
        : getSnippet(bodyText, query);

    const result: SearchResult = {
      id: cleanId(document._id),

      type: document._type,

      title: document.title,

      description,

      href,

      imageUrl:
        document._type === "blog"
          ? resolveSanityImagePreset(document.image, "card")
          : undefined,

      imageAlt:
        document._type === "blog" ? (document.image?.alt ?? "") : undefined,

      date:
        document._type === "blog" ? document.publishedAt : document._updatedAt,

      author: document.author
        ? {
            id: cleanId(document.author._id),

            name: document.author.name ?? "",

            jobTitle: document.author.jobTitle,
          }
        : undefined,

      taxonomy: resultTaxonomy.length > 0 ? resultTaxonomy : undefined,
    };

    indexed.push({
      result,
      score,

      searchableText,

      titleText,
      summaryText,

      bodyText: normalizeText(bodyText),

      authorText,
      taxonomyText,

      sortDate:
        document._type === "blog" ? document.publishedAt : document._updatedAt,
    });
  }

  /*
   * Facets are calculated from every query-matching,
   * indexable document before the currently selected
   * filters are applied. This keeps the filter UI useful
   * after a user narrows the result set.
   */
  const facets = buildFacets(indexed);

  const filtered = indexed.filter((item) => {
    if (!types.includes(item.result.type)) {
      return false;
    }

    if (taxonomy.length === 0) {
      return true;
    }

    if (item.result.type === "page") {
      return false;
    }

    return matchesTaxonomy({
      resultTaxonomy: item.result.taxonomy ?? [],

      requested: taxonomy,

      mode: taxonomyMatch,
    });
  });

  const sorted = sortResults(filtered, sort);

  const total = sorted.length;

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);

  const start = (safePage - 1) * pageSize;

  const results = sorted
    .slice(start, start + pageSize)
    .map((item) => item.result);

  return {
    query,
    locale: options.locale,

    page: safePage,

    pageSize,

    total,
    totalPages,

    sort,

    filters: {
      types,
      taxonomy,
      taxonomyMatch,
    },

    facets,

    results,
  };
}
