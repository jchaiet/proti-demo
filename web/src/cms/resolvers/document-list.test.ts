import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  getDynamicDocumentListQuery: vi.fn(),
  resolveSanityImagePreset: vi.fn(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: mocks.fetch,
  },
}));

vi.mock("@/sanity/queries/documentList", () => ({
  getDynamicDocumentListQuery: mocks.getDynamicDocumentListQuery,
}));

vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImagePreset: mocks.resolveSanityImagePreset,
}));

import { resolveDynamicDocumentList } from "./document-list";

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.getDynamicDocumentListQuery.mockReset();
  mocks.resolveSanityImagePreset.mockReset();

  mocks.getDynamicDocumentListQuery.mockReturnValue("DOCUMENT_LIST_QUERY");

  mocks.resolveSanityImagePreset.mockImplementation(
    (_image: unknown, preset: string) => `resolved-${preset}.jpg`,
  );
});

it("short-circuits when required resolver context is missing", async () => {
  expect(
    await resolveDynamicDocumentList({
      siteId: "",
      locale: "us-en",
      contentTypes: ["blog"],
      sort: "newest",
      limit: 10,
    }),
  ).toEqual([]);

  expect(
    await resolveDynamicDocumentList({
      siteId: "site-proti",
      locale: "",
      contentTypes: ["blog"],
      sort: "newest",
      limit: 10,
    }),
  ).toEqual([]);

  expect(
    await resolveDynamicDocumentList({
      siteId: "site-proti",
      locale: "us-en",
      contentTypes: [],
      sort: "newest",
      limit: 10,
    }),
  ).toEqual([]);

  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("normalizes taxonomy draft IDs, deduplicates them, maps content types, and clamps limit", async () => {
  mocks.fetch.mockResolvedValue([]);

  await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "us-en",
    contentTypes: ["article", "blog", "news", "resource"],
    taxonomyIds: [
      "drafts.taxonomy-nutrition",
      "taxonomy-nutrition",
      "taxonomy-health",
      "",
    ],
    taxonomyMatchLogic: "all",
    sort: "oldest",
    limit: 999,
  });

  expect(mocks.getDynamicDocumentListQuery).toHaveBeenCalledWith("oldest");

  expect(mocks.fetch).toHaveBeenCalledWith(
    "DOCUMENT_LIST_QUERY",
    {
      siteId: "site-proti",
      locale: "us-en",
      types: ["article", "blog", "news", "resource"],
      taxonomyIds: ["taxonomy-nutrition", "taxonomy-health"],
      taxonomyMatchLogic: "all",
      limit: 200,
    },
    {
      next: {
        revalidate: false,
      },
    },
  );
});

it("maps dynamic Blog/Article/News items to Article cards and Resources to Resource cards", async () => {
  const image = {
    asset: {
      _type: "reference",
      _ref: "image-abc",
    },
    hotspot: {
      _type: "sanity.imageHotspot",
      x: 0.5,
      y: 0.5,
      width: 0.5,
      height: 0.5,
    },
  };

  mocks.fetch.mockResolvedValue([
    {
      _id: "blog-1",
      _type: "blog",
      title: "Nutrition Blog",
      summary: "A guide",
      slug: "nutrition-blog",
      date: "2026-08-31T14:17:00.000Z",
      thumbnailImage: image,
      taxonomy: [
        {
          _id: "taxonomy-nutrition",
          title: "Nutrition",
          slug: "nutrition",
        },
      ],
    },
    {
      _id: "article-1",
      _type: "article",
      title: "Nutrition Article",
      path: "articles/custom-path",
      slug: "ignored-because-path-wins",
    },
    {
      _id: "news-1",
      _type: "news",
      title: "Nutrition News",
      slug: "nutrition-news",
    },
    {
      _id: "resource-1",
      _type: "resource",
      title: "Nutrition PDF",
      slug: "nutrition-pdf",
      fileType: "PDF",
      fileSize: "2 MB",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "us-en",
    contentTypes: ["article", "blog", "news", "resource"],
    sort: "newest",
    limit: 20,
  });

  expect(mocks.resolveSanityImagePreset).toHaveBeenCalledWith(image, "card");

  expect(result).toEqual([
    {
      id: "blog-1",
      contentType: "blog",
      cardType: "article",
      title: "Nutrition Blog",
      summary: "A guide",
      url: "/blog/nutrition-blog",
      date: "2026-08-31T14:17:00.000Z",
      thumbnail: "resolved-card.jpg",
      tags: ["Nutrition"],
      fileType: undefined,
      fileSize: undefined,
    },
    {
      id: "article-1",
      contentType: "article",
      cardType: "article",
      title: "Nutrition Article",
      summary: undefined,
      url: "/articles/custom-path",
      date: undefined,
      thumbnail: "resolved-card.jpg",
      tags: undefined,
      fileType: undefined,
      fileSize: undefined,
    },
    {
      id: "news-1",
      contentType: "news",
      cardType: "article",
      title: "Nutrition News",
      summary: undefined,
      url: "/news/nutrition-news",
      date: undefined,
      thumbnail: "resolved-card.jpg",
      tags: undefined,
      fileType: undefined,
      fileSize: undefined,
    },
    {
      id: "resource-1",
      contentType: "resource",
      cardType: "resource",
      title: "Nutrition PDF",
      summary: undefined,
      url: "/resources/nutrition-pdf",
      date: undefined,
      thumbnail: "resolved-card.jpg",
      tags: undefined,
      fileType: "PDF",
      fileSize: "2 MB",
    },
  ]);
});

it("keeps default-locale dynamic URLs unprefixed", async () => {
  mocks.fetch.mockResolvedValue([
    {
      _id: "blog-en",
      _type: "blog",
      title: "Nutrition",
      slug: "nutrition",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "us-en",
    localePrefix: "",
    contentTypes: ["blog"],
    sort: "newest",
    limit: 10,
  });

  expect(result[0]?.url).toBe("/blog/nutrition");
});

it("prefixes slug-based dynamic URLs for a non-default locale", async () => {
  mocks.fetch.mockResolvedValue([
    {
      _id: "blog-es",
      _type: "blog",
      title: "Nutrición",
      slug: "nutricion",
    },
    {
      _id: "news-es",
      _type: "news",
      title: "Noticias",
      slug: "noticias",
    },
    {
      _id: "resource-es",
      _type: "resource",
      title: "Recurso",
      slug: "recurso",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "us-es",
    localePrefix: "/us-es",
    contentTypes: ["blog", "news", "resource"],
    sort: "newest",
    limit: 10,
  });

  expect(result.map((item) => item.url)).toEqual([
    "/us-es/blog/nutricion",
    "/us-es/news/noticias",
    "/us-es/resources/recurso",
  ]);
});

it("prefixes projected paths for a non-default locale", async () => {
  mocks.fetch.mockResolvedValue([
    {
      _id: "article-es",
      _type: "article",
      title: "Artículo",
      path: "articles/articulo",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "us-es",
    localePrefix: "/us-es",
    contentTypes: ["article"],
    sort: "newest",
    limit: 10,
  });

  expect(result[0]?.url).toBe("/us-es/articles/articulo");
});

it("does not double-prefix an already-localized projected path", async () => {
  mocks.fetch.mockResolvedValue([
    {
      _id: "article-es",
      _type: "article",
      title: "Artículo",
      path: "/us-es/articles/articulo",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "us-es",
    localePrefix: "/us-es",
    contentTypes: ["article"],
    sort: "newest",
    limit: 10,
  });

  expect(result[0]?.url).toBe("/us-es/articles/articulo");
});

it("drops dynamic documents that have no title", async () => {
  mocks.fetch.mockResolvedValue([
    {
      _id: "blog-no-title",
      _type: "blog",
      slug: "missing-title",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "us-en",
    contentTypes: ["blog"],
    sort: "newest",
    limit: 10,
  });

  expect(result).toEqual([]);
});

it("normalizes a projected path that does not start with /", async () => {
  mocks.fetch.mockResolvedValue([
    {
      _id: "page-like-article",
      _type: "article",
      title: "Nutrition",
      path: "nutrition/article",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "us-en",
    contentTypes: ["article"],
    sort: "newest",
    limit: 10,
  });

  expect(result[0]?.url).toBe("/nutrition/article");
});
