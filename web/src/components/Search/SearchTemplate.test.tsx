import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  documentListProps: null as Record<string, unknown> | null,
  replace: vi.fn(),
  pathname: "/search",
  searchParams: "",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}));

vi.mock("mino-ui/blocks/DocumentListBlock", () => ({
  DocumentListBlock: (props: Record<string, unknown>) => {
    mocks.documentListProps = props;
    return <div data-testid="document-list" />;
  },
}));

import type { SearchResponse } from "@/cms/types/search";

import { SearchTemplate } from "./SearchTemplate";

beforeEach(() => {
  mocks.documentListProps = null;
  mocks.replace.mockReset();
  mocks.pathname = "/search";
  mocks.searchParams = "";
});

function buildResponse(
  overrides: Partial<SearchResponse> = {},
): SearchResponse {
  return {
    query: "nutrition",
    locale: "us-en",
    page: 1,
    pageSize: 12,
    total: 1,
    totalPages: 1,
    sort: "relevance",
    filters: {
      types: ["page", "blog"],
      taxonomy: [],
      taxonomyMatch: "any",
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
          count: 1,
        },
      ],
      taxonomy: [],
    },
    results: [
      {
        id: "blog-1",
        type: "blog",
        title: "Nutrition Basics",
        description: "A useful overview.",
        href: "/blog/nutrition-basics",
        imageUrl: "https://cdn.example.com/card.jpg",
        date: "2026-09-08T16:44:40Z",
        author: {
          id: "author-1",
          name: "Jane Smith",
          jobTitle: "Registered Dietitian",
        },
        taxonomy: [
          {
            id: "taxonomy-1",
            title: "Nutrition",
            path: "nutrition",
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("SearchTemplate result mapping", () => {
  it("formats the raw ISO result date for display without exposing the timestamp", () => {
    render(<SearchTemplate response={buildResponse()} />);

    const props = mocks.documentListProps as {
      documents: Array<Record<string, unknown>>;
    };

    expect(props.documents[0]).toMatchObject({
      date: "September 8, 2026",
    });
  });

  it("maps Author job title into the ArticleCard author role", () => {
    render(<SearchTemplate response={buildResponse()} />);

    const props = mocks.documentListProps as {
      documents: Array<{
        author?: Record<string, unknown>;
      }>;
    };

    expect(props.documents[0]?.author).toEqual({
      name: "Jane Smith",
      role: "Registered Dietitian",
    });
  });

  it("maps localized taxonomy titles into card tags", () => {
    render(
      <SearchTemplate
        response={buildResponse({
          locale: "us-es",
          results: [
            {
              id: "blog-es",
              type: "blog",
              title: "Nutrición Básica",
              href: "/us-es/blog/nutricion-basica",
              taxonomy: [
                {
                  id: "taxonomy-1",
                  title: "Nutrición",
                  path: "nutricion",
                },
              ],
            },
          ],
        })}
      />,
    );

    const props = mocks.documentListProps as {
      documents: Array<Record<string, unknown>>;
    };

    expect(props.documents[0]).toMatchObject({
      tags: ["Nutrición"],
    });
  });

  it("keeps Blog/Page result cards using the Article card presentation", () => {
    render(<SearchTemplate response={buildResponse()} />);

    const props = mocks.documentListProps as {
      documents: Array<Record<string, unknown>>;
    };

    expect(props.documents[0]).toMatchObject({
      contentType: "blog",
      cardType: "article",
      metaLabel: "Blog",
    });
  });
});
