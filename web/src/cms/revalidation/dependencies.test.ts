import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DOCUMENTS_BY_ID_QUERY,
  DYNAMIC_DOCUMENT_LIST_CONSUMERS_QUERY,
  REVERSE_DEPENDENCIES_QUERY,
  SITE_PUBLIC_ROUTE_INDEX_QUERY,
  resolveRevalidationPlan,
} from "./dependencies";

const { fetchMock } = vi.hoisted(() => ({
  fetchMock:
    vi.fn<
      (query: string, params?: Record<string, unknown>) => Promise<unknown>
    >(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: fetchMock,
  },
}));

const siteIndex = {
  site: {
    _id: "site-a",
    defaultLocale: "us-en",
    locales: [{ code: "us-en" }, { code: "us-es" }],
  },
  pages: [
    { _id: "home", locale: "us-en", isHomepage: true },
    { _id: "page-a", locale: "us-en", slug: "products" },
  ],
  blogs: [],
  authors: [],
  taxonomy: [],
  redirects: [],
};

function mockFetch({
  reverse = [],
  indexes = { "site-a": siteIndex },
  documents = [],
  dynamicConsumers = [],
}: {
  reverse?: Array<Record<string, unknown>>;
  indexes?: Record<string, unknown>;
  documents?: Array<Record<string, unknown>>;
  dynamicConsumers?: Array<Record<string, unknown>>;
} = {}) {
  fetchMock.mockImplementation(async (query, params) => {
    if (query === REVERSE_DEPENDENCIES_QUERY) {
      return reverse;
    }

    if (query === SITE_PUBLIC_ROUTE_INDEX_QUERY) {
      return (
        indexes[String(params?.siteId)] ?? {
          site: null,
          pages: [],
          blogs: [],
          authors: [],
          taxonomy: [],
          redirects: [],
        }
      );
    }

    if (query === DOCUMENTS_BY_ID_QUERY) {
      return documents;
    }

    if (query === DYNAMIC_DOCUMENT_LIST_CONSUMERS_QUERY) {
      return dynamicConsumers;
    }

    throw new Error("Unexpected query in test");
  });
}

describe("resolveRevalidationPlan", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("revalidates Pages that consume a Singleton", async () => {
    mockFetch({
      reverse: [
        {
          _id: "page-a",
          _type: "page",
          siteId: "site-a",
          locale: "us-en",
          slug: "products",
        },
      ],
    });

    const plan = await resolveRevalidationPlan({
      after: {
        _id: "singleton-a",
        _type: "singleton",
        siteId: "site-a",
        locale: "us-en",
        key: "global-cta",
      },
    });

    expect(plan?.paths).toEqual(["/products"]);
  });

  it("walks Header -> Navigation Set -> Site and revalidates the Site route set", async () => {
    const reverseById: Record<string, Array<Record<string, unknown>>> = {
      "header-a": [
        {
          _id: "nav-set-a",
          _type: "navigationSet",
          siteId: "site-a",
          locale: "us-en",
        },
      ],
      "nav-set-a": [
        {
          _id: "site-a",
          _type: "site",
          siteId: "site-a",
          defaultLocale: "us-en",
          locales: [{ code: "us-en" }, { code: "us-es" }],
        },
      ],
    };

    fetchMock.mockImplementation(async (query, params) => {
      if (query === REVERSE_DEPENDENCIES_QUERY) {
        return reverseById[String(params?.documentId)] ?? [];
      }

      if (query === SITE_PUBLIC_ROUTE_INDEX_QUERY) {
        return siteIndex;
      }

      if (query === DOCUMENTS_BY_ID_QUERY) {
        return [];
      }

      throw new Error("Unexpected query in test");
    });

    const plan = await resolveRevalidationPlan({
      after: {
        _id: "header-a",
        _type: "navigationHeader",
        siteId: "site-a",
        locale: "us-en",
      },
    });

    expect(plan?.paths).toEqual(["/", "/products", "/search", "/us-es/search"]);
  });

  it("invalidates both old and new Page hierarchies when a parent slug changes", async () => {
    const indexWithChild = {
      ...siteIndex,
      pages: [
        { _id: "home", locale: "us-en", isHomepage: true },
        { _id: "parent", locale: "us-en", slug: "catalog" },
        {
          _id: "child",
          locale: "us-en",
          slug: "widget",
          parentId: "parent",
        },
      ],
    };

    mockFetch({
      indexes: {
        "site-a": indexWithChild,
      },
    });

    const plan = await resolveRevalidationPlan({
      before: {
        _id: "parent",
        _type: "page",
        siteId: "site-a",
        locale: "us-en",
        slug: "products",
      },
      after: {
        _id: "parent",
        _type: "page",
        siteId: "site-a",
        locale: "us-en",
        slug: "catalog",
      },
    });

    expect(plan?.paths).toEqual([
      "/",
      "/catalog",
      "/catalog/widget",
      "/products",
      "/products/widget",
      "/sitemap.xml",
    ]);
  });

  it("revalidates a Blog plus its Author and Taxonomy landing pages", async () => {
    const indexWithEditorialRoutes = {
      ...siteIndex,
      blogs: [
        {
          _id: "blog-a",
          locale: "us-en",
          slug: "healthy-eating",
          authorId: "author-a",
          taxonomyIds: ["taxonomy-child"],
        },
      ],
      authors: [{ _id: "author-a", slug: "jane-doe" }],
      taxonomy: [
        { _id: "taxonomy-root", slug: "topics" },
        {
          _id: "taxonomy-child",
          slug: "nutrition",
          parentId: "taxonomy-root",
        },
      ],
    };

    mockFetch({
      indexes: {
        "site-a": indexWithEditorialRoutes,
      },
      documents: [
        {
          _id: "author-a",
          _type: "author",
          siteId: "site-a",
          slug: "jane-doe",
        },
        {
          _id: "taxonomy-child",
          _type: "taxonomy",
          siteId: "site-a",
          slug: "nutrition",
          parentId: "taxonomy-root",
        },
      ],
    });

    const plan = await resolveRevalidationPlan({
      before: {
        _id: "blog-a",
        _type: "blog",
        siteId: "site-a",
        locale: "us-en",
        slug: "healthy-eating",
        authorId: "author-a",
        taxonomyIds: ["taxonomy-child"],
      },
      after: {
        _id: "blog-a",
        _type: "blog",
        siteId: "site-a",
        locale: "us-en",
        slug: "healthy-eating",
        authorId: "author-a",
        taxonomyIds: ["taxonomy-child"],
      },
    });

    expect(plan?.paths).toEqual([
      "/authors/jane-doe",
      "/blog/healthy-eating",
      "/blog/topics/nutrition",
      "/sitemap.xml",
      "/us-es/authors/jane-doe",
      "/us-es/blog/topics/nutrition",
    ]);
  });

  it("revalidates Pages with matching dynamic Blog Document Lists", async () => {
    mockFetch({
      dynamicConsumers: [
        {
          _id: "page-a",
          _type: "page",
          siteId: "site-a",
          locale: "us-en",
          slug: "products",
          dynamicLists: [
            {
              taxonomyIds: ["taxonomy-child"],
              taxonomyMatchLogic: "any",
            },
          ],
        },
        {
          _id: "page-nonmatch",
          _type: "page",
          siteId: "site-a",
          locale: "us-en",
          slug: "other",
          dynamicLists: [
            {
              taxonomyIds: ["taxonomy-other"],
              taxonomyMatchLogic: "any",
            },
          ],
        },
      ],
    });

    const plan = await resolveRevalidationPlan({
      after: {
        _id: "blog-a",
        _type: "blog",
        siteId: "site-a",
        locale: "us-en",
        slug: "healthy-eating",
        taxonomyIds: ["taxonomy-child"],
      },
    });

    expect(plan?.paths).toContain("/products");
    expect(plan?.paths).not.toContain("/other");
  });

  it("revalidates Taxonomy landing pages when an Author used by Blogs changes", async () => {
    const indexWithEditorialRoutes = {
      ...siteIndex,
      blogs: [
        {
          _id: "blog-a",
          locale: "us-en",
          slug: "healthy-eating",
          authorId: "author-a",
          taxonomyIds: ["taxonomy-child"],
        },
      ],
      authors: [{ _id: "author-a", slug: "jane-doe" }],
      taxonomy: [
        { _id: "taxonomy-root", slug: "topics" },
        {
          _id: "taxonomy-child",
          slug: "nutrition",
          parentId: "taxonomy-root",
        },
      ],
    };

    mockFetch({
      reverse: [
        {
          _id: "blog-a",
          _type: "blog",
          siteId: "site-a",
          locale: "us-en",
          slug: "healthy-eating",
          authorId: "author-a",
          taxonomyIds: ["taxonomy-child"],
        },
      ],
      indexes: {
        "site-a": indexWithEditorialRoutes,
      },
      documents: [
        {
          _id: "taxonomy-child",
          _type: "taxonomy",
          siteId: "site-a",
          slug: "nutrition",
          parentId: "taxonomy-root",
        },
      ],
    });

    const plan = await resolveRevalidationPlan({
      after: {
        _id: "author-a",
        _type: "author",
        siteId: "site-a",
        slug: "jane-doe",
      },
    });

    expect(plan?.paths).toEqual([
      "/authors/jane-doe",
      "/blog/healthy-eating",
      "/blog/topics/nutrition",
      "/sitemap.xml",
      "/us-es/authors/jane-doe",
      "/us-es/blog/topics/nutrition",
    ]);
  });

  it("revalidates robots and sitemap for Site changes", async () => {
    mockFetch();

    const plan = await resolveRevalidationPlan({
      before: {
        _id: "site-a",
        _type: "site",
        defaultLocale: "us-en",
        locales: [{ code: "us-en" }, { code: "us-es" }],
      },
      after: {
        _id: "site-a",
        _type: "site",
        defaultLocale: "us-es",
        locales: [{ code: "us-en" }, { code: "us-es" }],
      },
    });

    expect(plan?.paths).toContain("/api/search");
    expect(plan?.paths).toContain("/robots.txt");
    expect(plan?.paths).toContain("/sitemap.xml");
    expect(plan?.paths).toContain("/us-en/products");
    expect(plan?.paths).toContain("/products");
  });
});
