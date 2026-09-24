import type {
  DocumentItem,
  DocumentListBlockProps,
  FilterOption,
  SortOption,
} from "mino-ui/blocks/DocumentListBlock";

import type { CmsDocumentListBlock, CmsDocumentListItem } from "@/cms/types";

import {
  mapArticleCard,
  mapResourceCard,
  mapTestimonialCard,
} from "@/cms/mappers/cards";

import { mapSectionHeading } from "@/cms/mappers/section-heading";

import { resolveDynamicDocumentList } from "@/cms/resolvers/document-list";

import { siteLocaleToLanguageTag } from "@/lib/routing/locale";

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

export interface MappedDocumentListBlock {
  props: DocumentListMappedProps;

  enableSearch: boolean;

  enableSorting: boolean;

  enablePagination: boolean;

  itemsPerPage: number;
}

export interface DocumentListMapperContext {
  siteId: string;
  locale: string;
  localePrefix?: string;
  visualEditing?: boolean;
}

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

function mapFilterOptions(block: CmsDocumentListBlock): FilterOption[] {
  if (!block.enableFilters || !block.filterOptions?.length) {
    return [];
  }

  return block.filterOptions
    .filter((option) => Boolean(option.label) && Boolean(option.value))
    .map((option) => ({
      label: option.label,

      value: option.value,
    }));
}

function mapSortOptions(block: CmsDocumentListBlock): SortOption[] {
  if (!block.enableSorting || !block.sortOptions?.length) {
    return [];
  }

  return block.sortOptions
    .filter((option) => Boolean(option.label) && Boolean(option.value))
    .map((option) => ({
      label: option.label,

      value: option.value,
    }));
}

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, "") ?? "";
}

function getDynamicTaxonomyIds(block: CmsDocumentListBlock): string[] {
  if (!block.dynamicTaxonomy?.length) {
    return [];
  }

  return block.dynamicTaxonomy
    .map((term) => cleanId(term._ref ?? term._id))
    .filter(Boolean);
}

export async function mapDocumentListBlock(
  block: CmsDocumentListBlock,
  context: DocumentListMapperContext,
): Promise<MappedDocumentListBlock> {
  const sourceMode = block.sourceMode ?? "manual";

  const documents =
    sourceMode === "dynamic"
      ? await resolveDynamicDocumentList({
          siteId: context.siteId,

          locale: context.locale,

          localePrefix: context.localePrefix,

          contentTypes: block.dynamicContentTypes ?? [],

          taxonomyIds: getDynamicTaxonomyIds(block),

          taxonomyMatchLogic: block.dynamicTaxonomyMatchLogic ?? "any",

          sort: block.dynamicSort ?? "newest",

          limit: block.dynamicLimit ?? 50,
          visualEditing: context.visualEditing,
        })
      : await mapManualDocumentListItems(block.documents);

  const heading = mapSectionHeading(block.heading);

  const filterOptions = mapFilterOptions(block);

  const sortOptions = mapSortOptions(block);

  return {
    props: {
      ...heading,

      documents,

      dateLocale: siteLocaleToLanguageTag(context.locale),

      alignment: block.alignment ?? "left",

      gridCols: block.gridCols ?? 3,

      filterOptions,

      filterTitle: block.filterTitle ?? "Categories",

      filterLogic: block.filterLogic ?? "radio",

      sortOptions,

      searchPlaceholder: block.searchPlaceholder ?? "Search documents...",

      emptyStateText:
        block.emptyStateText ?? "No documents found matching your criteria.",
    },

    enableSearch: block.enableSearch ?? true,

    enableSorting: block.enableSorting ?? false,

    enablePagination: block.enablePagination ?? true,

    itemsPerPage: Math.max(1, block.itemsPerPage ?? 9),
  };
}
