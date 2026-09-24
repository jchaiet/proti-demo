import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CmsDocumentListBlock } from "@/cms/types";

const mocks = vi.hoisted(() => ({
  mapArticleCard: vi.fn(),
  mapResourceCard: vi.fn(),
  mapTestimonialCard: vi.fn(),
  mapSectionHeading: vi.fn(),
  resolveDynamicDocumentList: vi.fn(),
  siteLocaleToLanguageTag: vi.fn(),
}));

vi.mock("@/cms/mappers/cards", () => ({
  mapArticleCard: mocks.mapArticleCard,
  mapResourceCard: mocks.mapResourceCard,
  mapTestimonialCard: mocks.mapTestimonialCard,
}));

vi.mock("@/cms/mappers/section-heading", () => ({
  mapSectionHeading: mocks.mapSectionHeading,
}));

vi.mock("@/cms/resolvers/document-list", () => ({
  resolveDynamicDocumentList: mocks.resolveDynamicDocumentList,
}));

vi.mock("@/lib/routing/locale", () => ({
  siteLocaleToLanguageTag: mocks.siteLocaleToLanguageTag,
}));

import { mapDocumentListBlock } from "./document-list";

function asBlock(value: Record<string, unknown>): CmsDocumentListBlock {
  return value as unknown as CmsDocumentListBlock;
}

beforeEach(() => {
  mocks.mapArticleCard.mockReset();
  mocks.mapResourceCard.mockReset();
  mocks.mapTestimonialCard.mockReset();
  mocks.mapSectionHeading.mockReset();
  mocks.resolveDynamicDocumentList.mockReset();
  mocks.siteLocaleToLanguageTag.mockReset();

  mocks.mapSectionHeading.mockReturnValue({
    eyebrow: "Resources",
    title: "Latest",
  });

  mocks.siteLocaleToLanguageTag.mockImplementation((locale: string) => {
    if (locale === "us-es") {
      return "es-US";
    }

    return "en-US";
  });
});

it("maps a manual ArticleCard without formatting away the raw ISO date", async () => {
  mocks.mapArticleCard.mockResolvedValue({
    title: "Nutrition Basics",
    summary: "A practical guide.",
    href: "/blog/nutrition-basics",
    publishedAt: "2026-08-31T14:17:00.000Z",
    category: "Nutrition",
    imageUrl: "article.jpg",
    author: {
      name: "Jane Smith",
      role: "Registered Dietitian",
      avatarUrl: "jane.jpg",
    },
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "manual",
      documents: [
        {
          _key: "article-1",
          _type: "articleCard",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "us-en",
    },
  );

  expect(mapped.props.documents).toEqual([
    {
      id: "article-1",
      contentType: "article",
      cardType: "article",
      title: "Nutrition Basics",
      summary: "A practical guide.",
      url: "/blog/nutrition-basics",
      date: "2026-08-31T14:17:00.000Z",
      tags: ["Nutrition"],
      thumbnail: "article.jpg",
      author: {
        name: "Jane Smith",
        role: "Registered Dietitian",
        avatarUrl: "jane.jpg",
      },
    },
  ]);

  expect(mapped.props.dateLocale).toBe("en-US");
});

it("maps manual Resource and Testimonial cards into DocumentItem shapes", async () => {
  mocks.mapResourceCard.mockResolvedValue({
    title: "Nutrition PDF",
    summary: "Downloadable guide",
    href: "/resources/nutrition.pdf",
    imageUrl: "resource.jpg",
    tags: ["Nutrition", "PDF"],
    fileType: "PDF",
    fileSize: "2 MB",
  });

  mocks.mapTestimonialCard.mockResolvedValue({
    quote: "This guide helped our team.",
    rating: 5,
    companyLogoUrl: "company.svg",
    author: {
      name: "Alex Doe",
      title: "Director",
      company: "Example Co",
      avatarUrl: "alex.jpg",
    },
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "manual",
      documents: [
        {
          _key: "resource-1",
          _type: "resourceCard",
        },
        {
          _key: "testimonial-1",
          _type: "testimonialCard",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "us-en",
    },
  );

  expect(mapped.props.documents[0]).toMatchObject({
    id: "resource-1",
    contentType: "resource",
    cardType: "resource",
    title: "Nutrition PDF",
    url: "/resources/nutrition.pdf",
    tags: ["Nutrition", "PDF"],
    fileType: "PDF",
    fileSize: "2 MB",
    metaLabel: "2 MB",
  });

  expect(mapped.props.documents[1]).toMatchObject({
    id: "testimonial-1",
    cardType: "testimonial",
    summary: "This guide helped our team.",
    rating: 5,
    companyLogoUrl: "company.svg",
    author: {
      name: "Alex Doe",
      title: "Director",
      company: "Example Co",
      avatarUrl: "alex.jpg",
    },
  });
});

it("drops manual card entries whose card mapper returns null", async () => {
  mocks.mapArticleCard.mockResolvedValue(null);

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "manual",
      documents: [
        {
          _key: "article-1",
          _type: "articleCard",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "us-en",
    },
  );

  expect(mapped.props.documents).toEqual([]);
});

it("passes dynamic taxonomy refs/IDs, match logic, sort, and limit to the resolver", async () => {
  mocks.resolveDynamicDocumentList.mockResolvedValue([
    {
      id: "blog-1",
      title: "Nutrition",
      url: "/blog/nutrition",
      cardType: "article",
    },
  ]);

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "dynamic",
      dynamicContentTypes: ["blog", "article"],
      dynamicTaxonomy: [
        {
          _type: "reference",
          _ref: "drafts.taxonomy-nutrition",
        },
        {
          _id: "taxonomy-health",
          title: "Health",
        },
      ],
      dynamicTaxonomyMatchLogic: "all",
      dynamicSort: "oldest",
      dynamicLimit: 24,
    }),
    {
      siteId: "site-proti",
      locale: "us-es",
      localePrefix: "/us-es",
    },
  );

  expect(mocks.resolveDynamicDocumentList).toHaveBeenCalledWith({
    siteId: "site-proti",
    locale: "us-es",
    localePrefix: "/us-es",
    contentTypes: ["blog", "article"],
    taxonomyIds: ["taxonomy-nutrition", "taxonomy-health"],
    taxonomyMatchLogic: "all",
    sort: "oldest",
    limit: 24,
  });

  expect(mapped.props.documents).toHaveLength(1);
  expect(mapped.props.dateLocale).toBe("es-US");
});

it("maps enabled filter/sort options and ignores blank options", async () => {
  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "manual",
      documents: [],
      enableFilters: true,
      filterOptions: [
        {
          label: "Nutrition",
          value: "nutrition",
        },
        {
          label: "",
          value: "invalid",
        },
      ],
      enableSorting: true,
      sortOptions: [
        {
          label: "Newest",
          value: "newest",
        },
        {
          label: "Broken",
          value: "",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "us-en",
    },
  );

  expect(mapped.props.filterOptions).toEqual([
    {
      label: "Nutrition",
      value: "nutrition",
    },
  ]);

  expect(mapped.props.sortOptions).toEqual([
    {
      label: "Newest",
      value: "newest",
    },
  ]);
});

it("preserves established defaults", async () => {
  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
    }),
    {
      siteId: "site-proti",
      locale: "us-en",
    },
  );

  expect(mapped).toMatchObject({
    enableSearch: true,
    enableSorting: false,
    enablePagination: true,
    itemsPerPage: 9,
  });

  expect(mapped.props).toMatchObject({
    alignment: "left",
    gridCols: 3,
    filterTitle: "Categories",
    filterLogic: "radio",
    searchPlaceholder: "Search documents...",
    emptyStateText: "No documents found matching your criteria.",
  });
});
