import type {
  DocumentItem,
  DocumentListBlockProps,
  FilterGroup,
  FilterOption,
  SortOption,
} from "mino-ui/blocks/DocumentListBlock";

import type {
  CmsDocumentListBlock,
  CmsDocumentListItem,
  CmsDocumentListDynamicSort,
} from "@/cms/types";
import type { SearchResponse, SearchSort } from "@/cms/types/search";

import {
  mapArticleCard,
  mapResourceCard,
  mapTestimonialCard,
} from "@/cms/mappers/cards";

import { mapSectionHeading } from "@/cms/mappers/section-heading";

import { resolveDynamicDocumentList } from "@/cms/resolvers/document-list";
import { searchContent } from "@/cms/resolvers/search";

import { siteLocaleToLanguageTag } from "@/lib/routing/locale";
import { getAppMessages } from "@/i18n/messages";
import type { DocumentListSortLabels } from "@/i18n/types";

export type DocumentListMappedProps = Omit<
  DocumentListBlockProps,
  | "searchQuery"
  | "selectedFilter"
  | "selectedSort"
  | "onSearchChange"
  | "onFilterChange"
  | "onSortChange"
  | "currentPage"
  | "totalPages"
  | "totalResults"
  | "onPageChange"
  | "isLoading"
>;

export interface ServerDocumentListState {
  searchQuery: string;

  selectedFilter: string | string[];

  selectedTaxonomy: string | string[];

  selectedSort: string;

  currentPage: number;
  totalPages: number;
  totalResults: number;
}

export interface MappedDocumentListBlock {
  props: DocumentListMappedProps;

  sourceMode: "manual" | "dynamic";

  enableSearch: boolean;

  enableSorting: boolean;

  enablePagination: boolean;

  itemsPerPage: number;

  serverState?: ServerDocumentListState;
}

export interface DocumentListMapperContext {
  siteId: string;
  locale: string;
  localePrefix?: string;
  visualEditing?: boolean;

  searchParams?: Record<string, string | string[] | undefined>;
}

const VALID_SEARCH_SORTS = new Set<SearchSort>([
  "relevance",
  "newest",
  "oldest",
  "title-asc",
  "title-desc",
]);

const VALID_LISTING_SORTS = new Set<CmsDocumentListDynamicSort>([
  "newest",
  "oldest",
  "title-asc",
  "title-desc",
]);

async function mapManualDocumentListItem(
  item: CmsDocumentListItem,
): Promise<DocumentItem | null> {
  switch (item._type) {
    case "articleCard": {
      const article = await mapArticleCard(item);

      if (!article) {
        return null;
      }

      return {
        id: item._key,

        contentType: "article",

        cardType: "article",

        title: article.title,

        summary: article.summary,

        url: article.href ?? "",

        date: article.publishedAt,

        tags: article.category ? [article.category] : [],

        thumbnail: article.imageUrl,

        author: article.author
          ? {
              name: article.author.name,

              role: article.author.role,

              avatarUrl: article.author.avatarUrl,
            }
          : undefined,
      };
    }

    case "resourceCard": {
      const resource = await mapResourceCard(item);

      if (!resource) {
        return null;
      }

      return {
        id: item._key,

        contentType: "resource",

        cardType: "resource",

        title: resource.title,

        summary: resource.summary,

        url: resource.href ?? "",

        thumbnail: resource.imageUrl,

        tags: resource.tags ?? [],

        fileType: resource.fileType,

        fileSize: resource.fileSize,

        metaLabel: resource.fileSize,
      };
    }

    case "testimonialCard": {
      const testimonial = await mapTestimonialCard(item);

      if (!testimonial) {
        return null;
      }

      return {
        id: item._key,

        cardType: "testimonial",

        title: testimonial.author.name,

        summary: testimonial.quote,

        url: "",

        thumbnail: testimonial.author.avatarUrl,

        metaLabel: testimonial.author.company,

        rating: testimonial.rating,

        companyLogoUrl: testimonial.companyLogoUrl,

        author: {
          name: testimonial.author.name,

          title: testimonial.author.title,

          company: testimonial.author.company,

          avatarUrl: testimonial.author.avatarUrl,
        },
      };
    }

    default:
      return null;
  }
}

async function mapManualDocumentListItems(
  items: CmsDocumentListItem[] | undefined,
): Promise<DocumentItem[]> {
  if (!items?.length) {
    return [];
  }

  const mapped = await Promise.all(items.map(mapManualDocumentListItem));

  return mapped.filter((item): item is DocumentItem => item !== null);
}

function normalizeControlValue(value?: string): string {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function mapFilterOptions(block: CmsDocumentListBlock): FilterOption[] {
  if (!block.enableFilters || !block.filterOptions?.length) {
    return [];
  }

  return block.filterOptions
    .map((option) => ({
      label: option.label?.trim() ?? "",
      value: normalizeControlValue(option.value),
    }))
    .filter((option) => Boolean(option.label) && Boolean(option.value));
}

function normalizeSortValue(value?: string): SearchSort | null {
  switch (normalizeControlValue(value)) {
    case "relevance":
      return "relevance";

    case "newest":
    case "date-desc":
    case "newest-first":
      return "newest";

    case "oldest":
    case "date-asc":
    case "oldest-first":
      return "oldest";

    case "title-asc":
    case "a-z":
      return "title-asc";

    case "title-desc":
    case "z-a":
      return "title-desc";

    default:
      return null;
  }
}

function mapSortOptions(
  block: CmsDocumentListBlock,
  labels: DocumentListSortLabels,
): SortOption[] {
  if (!block.enableSorting || !block.sortOptions?.length) {
    return [];
  }

  return block.sortOptions.flatMap((option) => {
    const value = normalizeSortValue(option.value);

    if (!value) {
      return [];
    }

    return [
      {
        label: labels[value],
        value,
      },
    ];
  });
}

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, "") ?? "";
}

function mapTaxonomyFilterOptions(block: CmsDocumentListBlock): FilterOption[] {
  if (
    !block.enableFilters ||
    block.sourceMode !== "dynamic" ||
    !block.filterTaxonomy?.length
  ) {
    return [];
  }

  return block.filterTaxonomy.flatMap((term) => {
    const value = cleanId(term._ref ?? term._id);
    const label = term.title?.trim() ?? "";

    if (
      !value ||
      !label ||
      term.kind === "group" ||
      term.includeInFilters === false
    ) {
      return [];
    }

    return [
      {
        label,
        value,
      },
    ];
  });
}

function getDynamicTaxonomyIds(block: CmsDocumentListBlock): string[] {
  if (!block.dynamicTaxonomy?.length) {
    return [];
  }

  return block.dynamicTaxonomy
    .filter((term) => term.kind !== "group")
    .map((term) => cleanId(term._ref ?? term._id))
    .filter(Boolean);
}

function toUrlSearchParams(
  record: DocumentListMapperContext["searchParams"],
): URLSearchParams {
  const params = new URLSearchParams();

  if (!record) {
    return params;
  }

  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }

      continue;
    }

    params.set(key, value);
  }

  return params;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseParamValues(params: URLSearchParams, key: string): string[] {
  return Array.from(
    new Set(
      params
        .getAll(key)
        .flatMap((value) => value.split(","))
        .map(normalizeControlValue)
        .filter(Boolean),
    ),
  );
}

function getSelectedFilter(
  filterLogic: "radio" | "checkbox",
  filterValues: string[],
): string | string[] {
  if (filterLogic === "checkbox") {
    return filterValues;
  }

  return filterValues[0] ?? "all";
}

function resolveRequestedSort({
  block,
  query,
  params,
  sortOptions,
}: {
  block: CmsDocumentListBlock;
  query: string;
  params: URLSearchParams;
  sortOptions: SortOption[];
}): SearchSort {
  const requested = normalizeSortValue(params.get("sort") ?? undefined);

  if (
    block.enableSorting &&
    requested &&
    VALID_SEARCH_SORTS.has(requested) &&
    sortOptions.some((option) => option.value === requested)
  ) {
    return requested;
  }

  if (query && block.enableSorting) {
    const relevanceOption = sortOptions.find(
      (option) => option.value === "relevance",
    );

    if (relevanceOption) {
      return "relevance";
    }

    const configuredDefault = sortOptions[0]?.value;

    if (
      configuredDefault &&
      VALID_SEARCH_SORTS.has(configuredDefault as SearchSort)
    ) {
      return configuredDefault as SearchSort;
    }
  }

  if (query) {
    return "relevance";
  }

  return block.dynamicSort ?? "newest";
}

function resolveListingSort({
  block,
  params,
  sortOptions,
}: {
  block: CmsDocumentListBlock;
  params: URLSearchParams;
  sortOptions: SortOption[];
}): CmsDocumentListDynamicSort {
  const requested = normalizeSortValue(params.get("sort") ?? undefined);

  if (
    block.enableSorting &&
    requested &&
    requested !== "relevance" &&
    VALID_LISTING_SORTS.has(requested) &&
    sortOptions.some((option) => option.value === requested)
  ) {
    return requested;
  }

  return block.dynamicSort ?? "newest";
}

function normalizeFilterValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function getDocumentFilterValues(document: DocumentItem): string[] {
  return [
    document.contentType,
    document.cardType,
    document.fileType,
    document.fileSize,
    document.metaLabel,
    ...(document.tags ?? []),
    document.author?.company,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeFilterValue);
}

function filterDocuments(
  documents: DocumentItem[],
  filterValues: string[],
): DocumentItem[] {
  const activeFilters = filterValues
    .map(normalizeFilterValue)
    .filter((value) => value && value !== "all");

  if (activeFilters.length === 0) {
    return documents;
  }

  return documents.filter((document) => {
    const values = getDocumentFilterValues(document);

    return activeFilters.some((filter) => values.includes(filter));
  });
}

function paginateDocuments({
  documents,
  requestedPage,
  itemsPerPage,
  enablePagination,
}: {
  documents: DocumentItem[];
  requestedPage: number;
  itemsPerPage: number;
  enablePagination: boolean;
}): {
  documents: DocumentItem[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
} {
  const totalResults = documents.length;

  if (!enablePagination) {
    return {
      documents,
      currentPage: 1,
      totalPages: 1,
      totalResults,
    };
  }

  const totalPages = Math.max(1, Math.ceil(totalResults / itemsPerPage));
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const start = (currentPage - 1) * itemsPerPage;

  return {
    documents: documents.slice(start, start + itemsPerPage),
    currentPage,
    totalPages,
    totalResults,
  };
}

function mapSearchResult(
  result: SearchResponse["results"][number],
): DocumentItem {
  const isResource = result.type === "resource";

  return {
    id: result.id,

    contentType: result.type,

    cardType: isResource ? "resource" : "article",

    title: result.title,

    summary: result.description,

    url: result.href,

    date: result.date,

    thumbnail: result.imageUrl,

    tags: result.taxonomy?.map((item) => item.title),

    fileType: result.fileType,

    fileSize: result.fileSize,

    metaLabel: isResource ? result.fileSize : undefined,

    author: result.author
      ? {
          name: result.author.name,
          role: result.author.jobTitle,
        }
      : undefined,
  };
}

async function resolveServerDocumentList({
  block,
  context,
  filterOptions,
  taxonomyFilterOptions,
  sortOptions,
  itemsPerPage,
  enablePagination,
}: {
  block: CmsDocumentListBlock;
  context: DocumentListMapperContext;
  filterOptions: FilterOption[];
  taxonomyFilterOptions: FilterOption[];
  sortOptions: SortOption[];
  itemsPerPage: number;
  enablePagination: boolean;
}): Promise<{
  documents: DocumentItem[];
  state: ServerDocumentListState;
}> {
  const params = toUrlSearchParams(context.searchParams);

  const query =
    block.enableSearch === false ? "" : (params.get("q")?.trim() ?? "");

  const filterLogic = block.filterLogic ?? "radio";

  const allowedFilterValues = new Set(
    filterOptions.map((option) => normalizeControlValue(option.value)),
  );

  const requestedFilterValues =
    filterOptions.length > 0
      ? parseParamValues(params, "filter").filter((value) =>
          allowedFilterValues.has(value),
        )
      : [];

  const filterValues =
    filterLogic === "radio"
      ? requestedFilterValues.slice(0, 1)
      : requestedFilterValues;

  const taxonomyFilterLogic = block.taxonomyFilterLogic ?? "checkbox";

  const allowedTaxonomyValues = new Set(
    taxonomyFilterOptions.map((option) => normalizeControlValue(option.value)),
  );

  const requestedTaxonomyValues =
    taxonomyFilterOptions.length > 0
      ? parseParamValues(params, "taxonomy").filter((value) =>
          allowedTaxonomyValues.has(value),
        )
      : [];

  const taxonomyFilterValues =
    taxonomyFilterLogic === "radio"
      ? requestedTaxonomyValues.slice(0, 1)
      : requestedTaxonomyValues;

  const selectedTaxonomy = getSelectedFilter(
    taxonomyFilterLogic,
    taxonomyFilterValues,
  );

  const requestedPage = enablePagination
    ? parsePositiveInt(params.get("page"), 1)
    : 1;

  const contentTypes = block.dynamicContentTypes ?? [];

  const requiresSearchQuery =
    block.enableSearch !== false && block.requireSearchQuery === true;

  if (requiresSearchQuery && !query) {
    const selectedSort = resolveRequestedSort({
      block,
      query,
      params,
      sortOptions,
    });

    return {
      documents: [],
      state: {
        searchQuery: "",
        selectedFilter: getSelectedFilter(filterLogic, filterValues),
        selectedTaxonomy,
        selectedSort,
        currentPage: 1,
        totalPages: 1,
        totalResults: 0,
      },
    };
  }

  if (contentTypes.length === 0) {
    const selectedSort = query
      ? resolveRequestedSort({ block, query, params, sortOptions })
      : resolveListingSort({ block, params, sortOptions });

    return {
      documents: [],
      state: {
        searchQuery: query,
        selectedFilter: getSelectedFilter(filterLogic, filterValues),
        selectedTaxonomy,
        selectedSort,
        currentPage: 1,
        totalPages: 1,
        totalResults: 0,
      },
    };
  }

  const taxonomyIds = getDynamicTaxonomyIds(block);
  const dynamicLimit = Math.min(Math.max(block.dynamicLimit ?? 50, 1), 200);
  const includesPages = contentTypes.includes("page");

  /*
   * Any active visitor search uses the full Search resolver so matching is not
   * limited to the initial Dynamic result window. Page listings also use the
   * Search resolver even before a query so nested Page URLs can be assembled
   * from their parent hierarchy instead of assuming every Page is top-level.
   * Existing non-Page Dynamic lists keep their lightweight resolver until a
   * visitor actually searches.
   */
  if (query || includesPages || taxonomyFilterOptions.length > 0) {
    const sort = resolveRequestedSort({
      block,
      query,
      params,
      sortOptions,
    });

    const response = await searchContent({
      siteId: context.siteId,
      locale: context.locale,

      query,
      includeAllOnEmptyQuery: !query,

      page: requestedPage,
      pageSize: enablePagination ? itemsPerPage : 1000,

      types: contentTypes,

      taxonomy: taxonomyFilterValues,
      taxonomyMatch: block.taxonomyFilterMatchLogic ?? "any",

      taxonomyScope: taxonomyIds,
      taxonomyScopeMatch: block.dynamicTaxonomyMatchLogic ?? "any",

      sort,
      filters: filterValues,

      /*
       * A Document List is an editorial listing rather than an SEO index. Keep
       * explicitly selected content eligible even when its crawler indexing
       * setting is noindex or its canonical points elsewhere.
       */
      respectSeoVisibility: false,

      maxResults: query ? undefined : dynamicLimit,
    });

    return {
      documents: response.results.map(mapSearchResult),

      state: {
        searchQuery: response.query,
        selectedFilter: getSelectedFilter(filterLogic, filterValues),
        selectedTaxonomy,
        selectedSort: response.sort,
        currentPage: response.page,
        totalPages: Math.max(1, response.totalPages),
        totalResults: response.total,
      },
    };
  }

  const listingSort = resolveListingSort({
    block,
    params,
    sortOptions,
  });

  const listingDocuments = await resolveDynamicDocumentList({
    siteId: context.siteId,
    locale: context.locale,
    localePrefix: context.localePrefix,
    contentTypes,
    taxonomyIds,
    taxonomyMatchLogic: block.dynamicTaxonomyMatchLogic ?? "any",
    sort: listingSort,
    limit: dynamicLimit,
    visualEditing: context.visualEditing,
  });

  const filteredDocuments = filterDocuments(listingDocuments, filterValues);
  const paginated = paginateDocuments({
    documents: filteredDocuments,
    requestedPage,
    itemsPerPage,
    enablePagination,
  });

  return {
    documents: paginated.documents,
    state: {
      searchQuery: "",
      selectedFilter: getSelectedFilter(filterLogic, filterValues),
      selectedTaxonomy,
      selectedSort: listingSort,
      currentPage: paginated.currentPage,
      totalPages: paginated.totalPages,
      totalResults: paginated.totalResults,
    },
  };
}

export async function mapDocumentListBlock(
  block: CmsDocumentListBlock,
  context: DocumentListMapperContext,
): Promise<MappedDocumentListBlock> {
  const sourceMode = block.sourceMode ?? "manual";

  const heading = mapSectionHeading(block.heading);

  const filterOptions = mapFilterOptions(block);

  const taxonomyFilterOptions = mapTaxonomyFilterOptions(block);

  const filterGroups: FilterGroup[] =
    sourceMode === "dynamic" && taxonomyFilterOptions.length > 0
      ? [
          ...(filterOptions.length > 0
            ? [
                {
                  id: "content",
                  title: block.filterTitle ?? "Categories",
                  options: filterOptions,
                  logic: block.filterLogic ?? "radio",
                } satisfies FilterGroup,
              ]
            : []),
          {
            id: "taxonomy",
            title: block.taxonomyFilterTitle ?? "Topics",
            options: taxonomyFilterOptions,
            logic: block.taxonomyFilterLogic ?? "checkbox",
          },
        ]
      : [];

  const documentListMessages = getAppMessages(context.locale).documentList;

  const { sortOptions: sortOptionLabels, ...documentListLabels } =
    documentListMessages;

  const sortOptions = mapSortOptions(block, sortOptionLabels);

  const enableSearch = block.enableSearch ?? true;

  const enableSorting = block.enableSorting ?? false;

  const enablePagination = block.enablePagination ?? true;

  const itemsPerPage = Math.max(1, block.itemsPerPage ?? 9);

  let documents: DocumentItem[];

  let serverState: ServerDocumentListState | undefined;

  if (sourceMode === "dynamic") {
    const resolved = await resolveServerDocumentList({
      block,
      context,
      filterOptions,
      taxonomyFilterOptions,
      sortOptions,
      itemsPerPage,
      enablePagination,
    });

    documents = resolved.documents;
    serverState = resolved.state;
  } else {
    documents = await mapManualDocumentListItems(block.documents);
  }

  return {
    props: {
      ...heading,

      documents,

      labels: documentListLabels,

      dateLocale: siteLocaleToLanguageTag(context.locale),

      alignment: block.alignment ?? "left",

      gridCols: block.gridCols ?? 3,

      filterOptions,

      filterGroups,

      filterTitle: block.filterTitle ?? "Categories",

      filterLogic: block.filterLogic ?? "radio",

      sortOptions,

      searchPlaceholder: block.searchPlaceholder ?? "Search documents...",

      emptyStateText:
        sourceMode === "dynamic" &&
        block.requireSearchQuery === true &&
        !serverState?.searchQuery
          ? (block.initialStateText ?? "Enter a search term to begin.")
          : (block.emptyStateText ??
            "No documents found matching your criteria."),
    },

    sourceMode,

    enableSearch,

    enableSorting,

    enablePagination,

    itemsPerPage,

    serverState,
  };
}
