"use client";

import { useEffect, useMemo, useState } from "react";

import { DocumentListBlock } from "mino-ui/blocks/DocumentListBlock";

import type {
  DocumentItem,
  FilterOption,
} from "mino-ui/blocks/DocumentListBlock";

import type { MappedDocumentListBlock } from "@/cms/mappers/blocks";

type DocumentListProps = MappedDocumentListBlock;

const normalizeValue = (value?: string) => value?.trim().toLowerCase() ?? "";

const getDocumentFilterValues = (document: DocumentItem): string[] => {
  const values = [
    document.contentType,
    document.cardType,
    document.fileType,
    document.metaLabel,

    ...(document.tags ?? []),

    document.author?.company,
  ];

  return values
    .filter((value): value is string => Boolean(value))
    .map(normalizeValue);
};

const matchesFilter = (
  document: DocumentItem,

  selectedFilter: string | string[],
): boolean => {
  const selected = Array.isArray(selectedFilter)
    ? selectedFilter
    : [selectedFilter];

  const activeFilters = selected
    .map(normalizeValue)
    .filter((value) => value && value !== "all");

  if (activeFilters.length === 0) {
    return true;
  }

  const documentValues = getDocumentFilterValues(document);

  return activeFilters.some((filter) => documentValues.includes(filter));
};

const matchesSearch = (
  document: DocumentItem,

  query: string,
): boolean => {
  const normalizedQuery = normalizeValue(query);

  if (!normalizedQuery) {
    return true;
  }

  const searchableValues = [
    document.title,
    document.summary,

    document.contentType,
    document.cardType,

    document.fileType,
    document.fileSize,
    document.metaLabel,

    ...(document.tags ?? []),

    document.author?.name,
    document.author?.role,
    document.author?.title,
    document.author?.company,
  ];

  const searchableText = searchableValues
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
};

const compareDates = (
  first?: string,
  second?: string,
  direction: "asc" | "desc" = "desc",
): number => {
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

  return direction === "asc" ? firstTime - secondTime : secondTime - firstTime;
};

const sortDocuments = (
  documents: DocumentItem[],

  selectedSort: string,
): DocumentItem[] => {
  const sortValue = normalizeValue(selectedSort);

  const sorted = [...documents];

  switch (sortValue) {
    case "newest":
    case "date-desc":
    case "newest-first":
      return sorted.sort((a, b) => compareDates(a.date, b.date, "desc"));

    case "oldest":
    case "date-asc":
    case "oldest-first":
      return sorted.sort((a, b) => compareDates(a.date, b.date, "asc"));

    case "title-asc":
    case "a-z":
      return sorted.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        }),
      );

    case "title-desc":
    case "z-a":
      return sorted.sort((a, b) =>
        b.title.localeCompare(a.title, undefined, {
          sensitivity: "base",
        }),
      );

    default:
      return sorted;
  }
};

const getInitialFilter = (
  filterLogic: "radio" | "checkbox",
): string | string[] => (filterLogic === "checkbox" ? [] : "all");

const getInitialSort = (
  sortOptions: MappedDocumentListBlock["props"]["sortOptions"],
): string => sortOptions?.[0]?.value ?? "";

export function DocumentList({
  props,
  enableSearch,
  enableSorting,
  enablePagination,
  itemsPerPage,
}: DocumentListProps) {
  const {
    documents,

    filterLogic = "radio",

    filterOptions = [],

    sortOptions = [],

    ...blockProps
  } = props;

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedFilter, setSelectedFilter] = useState<string | string[]>(() =>
    getInitialFilter(filterLogic),
  );

  const [selectedSort, setSelectedSort] = useState(() =>
    getInitialSort(sortOptions),
  );

  const [currentPage, setCurrentPage] = useState(1);

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      const searchMatches =
        !enableSearch || matchesSearch(document, searchQuery);

      const filterMatches =
        filterOptions.length === 0 || matchesFilter(document, selectedFilter);

      return searchMatches && filterMatches;
    });
  }, [documents, enableSearch, searchQuery, filterOptions, selectedFilter]);

  const sortedDocuments = useMemo(() => {
    if (!enableSorting) {
      return filteredDocuments;
    }

    return sortDocuments(filteredDocuments, selectedSort);
  }, [filteredDocuments, enableSorting, selectedSort]);

  const safeItemsPerPage = Math.max(1, itemsPerPage);

  const totalResults = sortedDocuments.length;

  const totalPages = enablePagination
    ? Math.max(1, Math.ceil(totalResults / safeItemsPerPage))
    : 1;

  const visibleDocuments = useMemo(() => {
    if (!enablePagination) {
      return sortedDocuments;
    }

    const startIndex = (currentPage - 1) * safeItemsPerPage;

    return sortedDocuments.slice(startIndex, startIndex + safeItemsPerPage);
  }, [sortedDocuments, enablePagination, currentPage, safeItemsPerPage]);

  useEffect(() => {
    setCurrentPage((previous) => Math.min(Math.max(previous, 1), totalPages));
  }, [totalPages]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    setCurrentPage(1);
  };

  const handleFilterChange = (filter: string | string[]) => {
    setSelectedFilter(filter);

    setCurrentPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort);

    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);

    setCurrentPage(nextPage);
  };

  return (
    <DocumentListBlock
      {...blockProps}
      documents={visibleDocuments}
      filterLogic={filterLogic}
      filterOptions={filterOptions as FilterOption[]}
      sortOptions={enableSorting ? sortOptions : []}
      searchQuery={searchQuery}
      selectedFilter={selectedFilter}
      selectedSort={selectedSort}
      currentPage={currentPage}
      totalPages={totalPages}
      totalResults={totalResults}
      onSearchChange={enableSearch ? handleSearchChange : undefined}
      onFilterChange={filterOptions.length > 0 ? handleFilterChange : undefined}
      onSortChange={
        enableSorting && sortOptions.length > 0 ? handleSortChange : undefined
      }
      onPageChange={enablePagination ? handlePageChange : undefined}
    />
  );
}
