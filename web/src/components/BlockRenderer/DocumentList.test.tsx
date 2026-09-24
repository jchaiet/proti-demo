import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DocumentItem } from "mino-ui/blocks/DocumentListBlock";

const mocks = vi.hoisted(() => ({
  latestProps: null as Record<string, unknown> | null,
}));

vi.mock("mino-ui/blocks/DocumentListBlock", () => ({
  DocumentListBlock: (props: Record<string, unknown>) => {
    mocks.latestProps = props;

    return <div data-testid="document-list-block" />;
  },
}));

import { DocumentList } from "./DocumentList";

const documents: DocumentItem[] = [
  {
    id: "old",
    contentType: "blog",
    cardType: "article",
    title: "Old Nutrition Article",
    summary: "Older post",
    url: "/blog/old",
    date: "2026-08-01T12:00:00Z",
    tags: ["Nutrition"],
    author: {
      name: "Jane Smith",
      role: "Registered Dietitian",
    },
  },
  {
    id: "new",
    contentType: "blog",
    cardType: "article",
    title: "New Health Article",
    summary: "Newer post",
    url: "/blog/new",
    date: "2026-09-01T12:00:00Z",
    tags: ["Health"],
    author: {
      name: "Alex Doe",
      role: "Editor",
    },
  },
  {
    id: "resource",
    contentType: "resource",
    cardType: "resource",
    title: "Food Guide",
    summary: "PDF resource",
    url: "/resources/food-guide",
    tags: ["Nutrition"],
    fileType: "PDF",
    fileSize: "2 MB",
  },
];

function renderDocumentList(overrides: Record<string, unknown> = {}) {
  return render(
    <DocumentList
      props={{
        documents,
        filterLogic: "radio",
        filterOptions: [
          {
            label: "All",
            value: "all",
          },
          {
            label: "Nutrition",
            value: "nutrition",
          },
        ],
        sortOptions: [
          {
            label: "Newest",
            value: "newest",
          },
          {
            label: "Oldest",
            value: "oldest",
          },
        ],
        dateLocale: "en-US",
      }}
      enableSearch
      enableSorting
      enablePagination
      itemsPerPage={2}
      {...overrides}
    />,
  );
}

function getProps() {
  return mocks.latestProps as {
    documents: DocumentItem[];
    searchQuery: string;
    selectedFilter: string | string[];
    selectedSort: string;
    currentPage: number;
    totalPages: number;
    totalResults: number;
    onSearchChange?: (query: string) => void;
    onFilterChange?: (filter: string | string[]) => void;
    onSortChange?: (sort: string) => void;
    onPageChange?: (page: number) => void;
    dateLocale?: string;
  };
}

beforeEach(() => {
  mocks.latestProps = null;
});

it("sorts newest first using raw ISO dates before paginating", () => {
  renderDocumentList();

  const props = getProps();

  expect(props.selectedSort).toBe("newest");
  expect(props.documents.map((document) => document.id)).toEqual([
    "new",
    "old",
  ]);
  expect(props.totalResults).toBe(3);
  expect(props.totalPages).toBe(2);
  expect(props.currentPage).toBe(1);
  expect(props.dateLocale).toBe("en-US");
});

it("switches to oldest-first ordering", async () => {
  renderDocumentList();

  act(() => {
    getProps().onSortChange?.("oldest");
  });

  await waitFor(() => {
    expect(getProps().documents.map((document) => document.id)).toEqual([
      "old",
      "new",
    ]);
  });
});

it("searches across title, tags, Author role, and resource metadata", async () => {
  renderDocumentList();

  act(() => {
    getProps().onSearchChange?.("dietitian");
  });

  await waitFor(() => {
    expect(getProps().documents.map((document) => document.id)).toEqual([
      "old",
    ]);
    expect(getProps().totalResults).toBe(1);
  });

  act(() => {
    getProps().onSearchChange?.("pdf");
  });

  await waitFor(() => {
    expect(getProps().documents.map((document) => document.id)).toEqual([
      "resource",
    ]);
  });
});

it("applies taxonomy-style filters case-insensitively", async () => {
  renderDocumentList();

  act(() => {
    getProps().onFilterChange?.("NUTRITION");
  });

  await waitFor(() => {
    expect(getProps().totalResults).toBe(2);
    expect(getProps().documents.map((document) => document.id)).toEqual([
      "old",
      "resource",
    ]);
  });
});

it("moves between pages and clamps out-of-range page requests", async () => {
  renderDocumentList();

  act(() => {
    getProps().onPageChange?.(2);
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(2);
    expect(getProps().documents.map((document) => document.id)).toEqual([
      "resource",
    ]);
  });

  act(() => {
    getProps().onPageChange?.(999);
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(2);
  });

  act(() => {
    getProps().onPageChange?.(-5);
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(1);
  });
});

it("resets pagination to page 1 when search/filter/sort changes", async () => {
  renderDocumentList();

  act(() => {
    getProps().onPageChange?.(2);
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(2);
  });

  act(() => {
    getProps().onSearchChange?.("nutrition");
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(1);
  });

  act(() => {
    getProps().onFilterChange?.("nutrition");
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(1);
  });

  act(() => {
    getProps().onSortChange?.("oldest");
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(1);
  });
});

it("passes no interactive handlers when those features are disabled", () => {
  render(
    <DocumentList
      props={{
        documents,
      }}
      enableSearch={false}
      enableSorting={false}
      enablePagination={false}
      itemsPerPage={9}
    />,
  );

  const props = getProps();

  expect(props.documents).toHaveLength(3);
  expect(props.totalPages).toBe(1);
  expect(props.onSearchChange).toBeUndefined();
  expect(props.onSortChange).toBeUndefined();
  expect(props.onPageChange).toBeUndefined();
});
