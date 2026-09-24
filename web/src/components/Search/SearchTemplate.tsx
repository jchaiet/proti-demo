"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DocumentListBlock } from "mino-ui/blocks/DocumentListBlock";

import type {
  DocumentItem,
  FilterGroup,
  SortOption,
} from "mino-ui/blocks/DocumentListBlock";

import type {
  SearchContentType,
  SearchResponse,
  SearchSort,
  SearchTaxonomyMatch,
} from "@/cms/types/search";

export interface SearchTemplateProps {
  response: SearchResponse;
}

const ALL_CONTENT_TYPES: SearchContentType[] = ["page", "blog"];

const SORT_OPTIONS: SortOption[] = [
  {
    label: "Relevance",
    value: "relevance",
  },
  {
    label: "Newest",
    value: "newest",
  },
  {
    label: "Oldest",
    value: "oldest",
  },
  {
    label: "Title A–Z",
    value: "title-asc",
  },
  {
    label: "Title Z–A",
    value: "title-desc",
  },
];

function getIntlLocale(locale: string): string {
  const [region, language] = locale.split("-");

  if (!region || !language) {
    return locale;
  }

  return `${language.toLowerCase()}-${region.toUpperCase()}`;
}

function formatSearchResultDate(
  value: string | undefined,
  locale: string,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  try {
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }
}

function mapSearchResult(
  result: SearchResponse["results"][number],
  locale: string,
): DocumentItem {
  return {
    id: result.id,

    contentType: result.type === "blog" ? "blog" : "article",

    cardType: "article",

    title: result.title,
    summary: result.description,
    url: result.href,

    date: formatSearchResultDate(result.date, locale),
    thumbnail: result.imageUrl,

    metaLabel: result.type === "blog" ? "Blog" : "Page",

    tags: result.taxonomy?.map((item) => item.title),

    author: result.author
      ? {
          name: result.author.name,
          role: result.author.jobTitle,
        }
      : undefined,
  };
}

function buildSummary(response: SearchResponse): string {
  if (!response.query) {
    return "Search pages and blog posts across this site.";
  }

  if (response.total === 0) {
    return `No results for “${response.query}”.`;
  }

  return `${response.total} ${
    response.total === 1 ? "result" : "results"
  } for “${response.query}”.`;
}

export function SearchTemplate({ response }: SearchTemplateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();

  const [localQuery, setLocalQuery] = useState(response.query);

  useEffect(() => {
    setLocalQuery(response.query);
  }, [response.query]);

  const replaceParams = useCallback(
    (update: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());

      update(params);

      const queryString = params.toString();

      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.replace(nextUrl, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (localQuery === response.query) {
      return;
    }

    const timeout = window.setTimeout(() => {
      replaceParams((params) => {
        const value = localQuery.trim();

        if (value) {
          params.set("q", value);
        } else {
          params.delete("q");
        }

        params.delete("page");
      });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [localQuery, replaceParams, response.query]);

  const setTypes = (value: string | string[]) => {
    const values = Array.isArray(value) ? value : [value];

    const selected = values.filter(
      (item): item is SearchContentType => item === "page" || item === "blog",
    );

    replaceParams((params) => {
      if (
        selected.length === 0 ||
        selected.length === ALL_CONTENT_TYPES.length
      ) {
        params.delete("type");
      } else {
        params.set("type", selected.join(","));
      }

      params.delete("page");
    });
  };

  const setTaxonomy = (value: string | string[]) => {
    const values = Array.isArray(value) ? value : [value];

    replaceParams((params) => {
      params.delete("taxonomy");

      for (const item of values) {
        params.append("taxonomy", item);
      }

      if (values.length <= 1) {
        params.delete("taxonomyMatch");
      }

      params.delete("page");
    });
  };

  const setTaxonomyMatch = (value: string | string[]) => {
    const rawValue = Array.isArray(value) ? value[0] : value;

    const match: SearchTaxonomyMatch = rawValue === "all" ? "all" : "any";

    replaceParams((params) => {
      if (match === "any") {
        params.delete("taxonomyMatch");
      } else {
        params.set("taxonomyMatch", match);
      }

      params.delete("page");
    });
  };

  const setSort = (value: string) => {
    const sort = value as SearchSort;

    replaceParams((params) => {
      if (sort === "relevance") {
        params.delete("sort");
      } else {
        params.set("sort", sort);
      }

      params.delete("page");
    });
  };

  const setPage = (page: number) => {
    replaceParams((params) => {
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
    });
  };

  const filterGroups: FilterGroup[] = [];

  if (response.query) {
    filterGroups.push({
      id: "content-type",
      title: "Content type",
      logic: "checkbox",
      selected: response.filters.types,
      onChange: setTypes,
      options: response.facets.types.map((facet) => ({
        value: facet.value,
        label: `${facet.label} (${facet.count})`,
      })),
    });

    if (response.facets.taxonomy.length > 0) {
      filterGroups.push({
        id: "taxonomy",
        title: "Taxonomy",
        logic: "checkbox",
        selected: response.filters.taxonomy,
        onChange: setTaxonomy,
        options: response.facets.taxonomy.map((facet) => ({
          value: facet.value,
          label: `${facet.label} (${facet.count})`,
        })),
      });
    }

    if (response.filters.taxonomy.length > 1) {
      filterGroups.push({
        id: "taxonomy-match",
        title: "Taxonomy matching",
        logic: "radio",
        selected: response.filters.taxonomyMatch,
        onChange: setTaxonomyMatch,
        options: [
          {
            value: "any",
            label: "Match any selected term",
          },
          {
            value: "all",
            label: "Match all selected terms",
          },
        ],
      });
    }
  }

  return (
    <DocumentListBlock
      title="Search"
      description={buildSummary(response)}
      documents={response.results.map((result) =>
        mapSearchResult(result, response.locale),
      )}
      filterGroups={filterGroups}
      searchPlaceholder="Search this site"
      searchQuery={localQuery}
      onSearchChange={setLocalQuery}
      sortOptions={response.query ? SORT_OPTIONS : []}
      selectedSort={response.sort}
      onSortChange={response.query ? setSort : undefined}
      currentPage={response.page}
      totalPages={response.totalPages}
      totalResults={response.total}
      onPageChange={response.totalPages > 1 ? setPage : undefined}
      isLoading={isPending}
      emptyStateText={
        response.query
          ? "No matching pages or blog posts were found."
          : "Enter a search term above to begin."
      }
      alignment="left"
      gridCols={3}
    />
  );
}
