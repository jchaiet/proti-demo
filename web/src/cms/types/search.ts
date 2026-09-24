export type SearchContentType = "page" | "blog";

export type SearchSort =
  | "relevance"
  | "newest"
  | "oldest"
  | "title-asc"
  | "title-desc";

export type SearchTaxonomyMatch = "any" | "all";

export interface SearchTaxonomyItem {
  id: string;
  title: string;
  path: string;
}

export interface SearchAuthor {
  id: string;
  name: string;
  jobTitle?: string;
}

export interface SearchResult {
  id: string;
  type: SearchContentType;

  title: string;
  description?: string;

  href: string;

  imageUrl?: string;
  imageAlt?: string;

  date?: string;

  author?: SearchAuthor;
  taxonomy?: SearchTaxonomyItem[];
}

export interface SearchFacetOption<TValue extends string = string> {
  value: TValue;
  label: string;
  count: number;
}

export interface SearchFacets {
  types: SearchFacetOption<SearchContentType>[];
  taxonomy: SearchFacetOption[];
}

export interface SearchResponse {
  query: string;
  locale: string;

  page: number;
  pageSize: number;

  total: number;
  totalPages: number;

  sort: SearchSort;

  filters: {
    types: SearchContentType[];
    taxonomy: string[];
    taxonomyMatch: SearchTaxonomyMatch;
  };

  facets: SearchFacets;

  results: SearchResult[];
}

export interface SearchContentOptions {
  siteId: string;
  locale: string;

  query: string;

  page?: number;
  pageSize?: number;

  types?: SearchContentType[];

  taxonomy?: string[];
  taxonomyMatch?: SearchTaxonomyMatch;

  sort?: SearchSort;
}
