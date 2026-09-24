import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  resolveSanityImagePreset: vi.fn(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: mocks.fetch,
    withConfig: () => ({
      fetch: mocks.fetch,
    }),
  },
}));

vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImagePreset: mocks.resolveSanityImagePreset,
}));

import { searchContent } from "./search";

type MockSite = {
  _id: string;
  domains: string[];
  defaultLocale: string;
  defaultIndexing?: "index" | "noindex";
};

type MockDocument = Record<string, unknown>;
type MockTaxonomy = Record<string, unknown>;

const site: MockSite = {
  _id: "site-proti",
  domains: ["example.com"],
  defaultLocale: "us-en",
  defaultIndexing: "index",
};

let documents: MockDocument[] = [];
let taxonomy: MockTaxonomy[] = [];

function installFetchMock(currentSite: MockSite | null = site) {
  mocks.fetch.mockImplementation(
    async (query: string, params: Record<string, unknown>) => {
      if (query.includes('"defaultIndexing"')) {
        return currentSite;
      }

      if (query.includes('_type in ["page", "blog"]')) {
        return documents;
      }

      if (query.includes('_type == "taxonomy"')) {
        return taxonomy;
      }

      throw new Error(`Unexpected Search query: ${query.slice(0, 80)}`);
    },
  );
}

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.resolveSanityImagePreset.mockReset();
  mocks.resolveSanityImagePreset.mockImplementation(
    (_image: unknown, preset: string) => `resolved-${preset}-image`,
  );

  documents = [];
  taxonomy = [];
  installFetchMock();
});

it("does not query Sanity for a blank search term", async () => {
  const response = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "   ",
  });

  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(response.total).toBe(0);
  expect(response.results).toEqual([]);
});

it("passes Site and locale into every Search data query", async () => {
  documents = [
    {
      _id: "page-1",
      _type: "page",
      title: "Nutrition",
      locale: "us-es",
      slug: "nutrition",
      sections: [],
    },
  ];

  await searchContent({
    siteId: "site-proti",
    locale: "us-es",
    query: "nutrition",
  });

  expect(mocks.fetch).toHaveBeenCalledTimes(3);

  for (const [, params, fetchOptions] of mocks.fetch.mock.calls) {
    expect(params).toMatchObject({
      siteId: "site-proti",
      locale: "us-es",
    });

    expect(fetchOptions).toEqual({
      next: {
        revalidate: 0,
      },
    });
  }
});

it("matches visible content rendered through a referenced Singleton", async () => {
  documents = [
    {
      _id: "page-singleton",
      _type: "page",
      title: "Shared promotion",
      locale: "us-en",
      slug: "shared-promotion",
      sections: [
        {
          _type: "singletonReferenceBlock",
          singleton: {
            _id: "singleton-global-cta",
            title: "Global CTA",
            key: "global-cta",
            locale: "us-en",
            component: {
              _type: "contentBlock",
              body: "Schedule your nutrition consultation today.",
            },
          },
        },
      ],
    },
  ];

  const response = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "consultation",
  });

  expect(response.results.map((result) => result.id)).toEqual([
    "page-singleton",
  ]);
});

it("matches visible body content but rejects a term that exists only in href/script/code data", async () => {
  documents = [
    {
      _id: "page-visible",
      _type: "page",
      title: "Healthy Living",
      locale: "us-en",
      slug: "healthy-living",
      sections: [
        {
          _type: "block",
          children: [
            {
              _type: "span",
              text: "Nutrition supports long-term health.",
            },
          ],
        },
      ],
    },
    {
      _id: "page-hidden",
      _type: "page",
      title: "Unrelated Article",
      locale: "us-en",
      slug: "unrelated",
      sections: [
        {
          title: "Completely different visible content",
          href: "https://nutrition.example.com",
          script: "nutrition",
          code: "nutrition",
        },
      ],
    },
  ];

  const response = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "nutrition",
  });

  expect(response.results.map((result) => result.id)).toEqual(["page-visible"]);
});

it("builds default-locale Page and Blog URLs without a locale prefix", async () => {
  documents = [
    {
      _id: "page-parent",
      _type: "page",
      title: "Products",
      locale: "us-en",
      slug: "products",
      sections: [],
    },
    {
      _id: "page-child",
      _type: "page",
      title: "Nutrition Widget",
      locale: "us-en",
      slug: "widget",
      parentId: "page-parent",
      sections: [],
    },
    {
      _id: "blog-1",
      _type: "blog",
      title: "Nutrition Basics",
      locale: "us-en",
      slug: "nutrition-basics",
      summary: "Nutrition overview",
      publishedAt: "2026-09-08T16:44:40Z",
      sections: [],
    },
  ];

  const response = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "nutrition",
  });

  expect(response.results).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "page-child",
        href: "/products/widget",
      }),
      expect.objectContaining({
        id: "blog-1",
        href: "/blog/nutrition-basics",
      }),
    ]),
  );
});

it("adds the active non-default locale prefix to result URLs", async () => {
  documents = [
    {
      _id: "page-es",
      _type: "page",
      title: "Nutrición",
      locale: "us-es",
      slug: "nutricion",
      sections: [],
    },
    {
      _id: "blog-es",
      _type: "blog",
      title: "Nutrición Básica",
      locale: "us-es",
      slug: "nutricion-basica",
      summary: "Guía de nutrición",
      sections: [],
    },
  ];

  const response = await searchContent({
    siteId: "site-proti",
    locale: "us-es",
    query: "nutrición",
  });

  expect(response.results).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "page-es",
        href: "/us-es/nutricion",
      }),
      expect.objectContaining({
        id: "blog-es",
        href: "/us-es/blog/nutricion-basica",
      }),
    ]),
  );
});

it("excludes noindex documents", async () => {
  documents = [
    {
      _id: "page-index",
      _type: "page",
      title: "Nutrition Public",
      locale: "us-en",
      slug: "nutrition-public",
      sections: [],
      seo: {
        indexing: "index",
      },
    },
    {
      _id: "page-noindex",
      _type: "page",
      title: "Nutrition Private",
      locale: "us-en",
      slug: "nutrition-private",
      sections: [],
      seo: {
        indexing: "noindex",
      },
    },
  ];

  const response = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "nutrition",
  });

  expect(response.results.map((result) => result.id)).toEqual(["page-index"]);
});

it("excludes a result whose authored canonical points somewhere else", async () => {
  documents = [
    {
      _id: "page-canonical",
      _type: "page",
      title: "Nutrition Canonical",
      locale: "us-en",
      slug: "nutrition",
      sections: [],
      seo: {
        canonicalUrl: "https://example.com/different-page",
      },
    },
  ];

  const response = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "nutrition",
  });

  expect(response.results).toEqual([]);
});

it("keeps a matching canonical URL even when trailing-slash style differs", async () => {
  documents = [
    {
      _id: "page-canonical",
      _type: "page",
      title: "Nutrition Canonical",
      locale: "us-en",
      slug: "nutrition",
      sections: [],
      seo: {
        canonicalUrl: "https://example.com/nutrition/",
      },
    },
  ];

  const response = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "nutrition",
  });

  expect(response.results).toHaveLength(1);
  expect(response.results[0]?.href).toBe("/nutrition");
});

it("ranks an exact title match above weaker visible-body matches", async () => {
  documents = [
    {
      _id: "page-body",
      _type: "page",
      title: "Healthy Food",
      locale: "us-en",
      slug: "healthy-food",
      sections: [
        {
          body: "Nutrition appears only in the body.",
        },
      ],
    },
    {
      _id: "page-exact",
      _type: "page",
      title: "Nutrition",
      locale: "us-en",
      slug: "nutrition",
      sections: [],
    },
  ];

  const response = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "nutrition",
    sort: "relevance",
  });

  expect(response.results.map((result) => result.id)).toEqual([
    "page-exact",
    "page-body",
  ]);
});

it("returns localized Author job title, localized Taxonomy, and hotspot-aware Blog image mapping", async () => {
  taxonomy = [
    {
      _id: "taxonomy-health",
      title: "Salud",
      slug: "salud",
    },
    {
      _id: "taxonomy-nutrition",
      title: "Nutrición",
      slug: "nutricion",
      parentId: "taxonomy-health",
    },
  ];

  const image = {
    asset: {
      _type: "reference",
      _ref: "image-abc",
    },
    crop: {
      _type: "sanity.imageCrop",
      top: 0.1,
      bottom: 0,
      left: 0,
      right: 0,
    },
    hotspot: {
      _type: "sanity.imageHotspot",
      x: 0.3,
      y: 0.5,
      width: 0.4,
      height: 0.4,
    },
    alt: "Healthy food",
  };

  documents = [
    {
      _id: "blog-es",
      _type: "blog",
      title: "Nutrición para todos",
      locale: "us-es",
      slug: "nutricion-para-todos",
      summary: "Una guía de nutrición.",
      publishedAt: "2026-09-08T16:44:40Z",
      image,
      author: {
        _id: "author-1",
        name: "María López",
        jobTitle: "Dietista registrada",
      },
      taxonomy: [
        {
          _id: "taxonomy-nutrition",
          title: "Nutrición",
          slug: "nutricion",
          parentId: "taxonomy-health",
        },
      ],
      sections: [],
    },
  ];

  const response = await searchContent({
    siteId: "site-proti",
    locale: "us-es",
    query: "nutrición",
  });

  expect(mocks.resolveSanityImagePreset).toHaveBeenCalledWith(image, "card");

  expect(response.results[0]).toMatchObject({
    id: "blog-es",
    href: "/us-es/blog/nutricion-para-todos",
    imageUrl: "resolved-card-image",
    imageAlt: "Healthy food",
    author: {
      id: "author-1",
      name: "María López",
      jobTitle: "Dietista registrada",
    },
    taxonomy: [
      {
        id: "taxonomy-nutrition",
        title: "Nutrición",
        path: "salud/nutricion",
      },
    ],
  });

  expect(response.facets.taxonomy).toEqual([
    {
      value: "salud/nutricion",
      label: "Nutrición",
      count: 1,
    },
  ]);
});

it("supports taxonomy any/all filtering using Taxonomy IDs or paths", async () => {
  taxonomy = [
    {
      _id: "taxonomy-food",
      title: "Food",
      slug: "food",
    },
    {
      _id: "taxonomy-nutrition",
      title: "Nutrition",
      slug: "nutrition",
    },
  ];

  documents = [
    {
      _id: "blog-both",
      _type: "blog",
      title: "Nutrition Food Guide",
      locale: "us-en",
      slug: "both",
      summary: "Nutrition and food",
      taxonomy: [
        {
          _id: "taxonomy-food",
          title: "Food",
          slug: "food",
        },
        {
          _id: "taxonomy-nutrition",
          title: "Nutrition",
          slug: "nutrition",
        },
      ],
      sections: [],
    },
    {
      _id: "blog-one",
      _type: "blog",
      title: "Nutrition Guide",
      locale: "us-en",
      slug: "one",
      summary: "Nutrition only",
      taxonomy: [
        {
          _id: "taxonomy-nutrition",
          title: "Nutrition",
          slug: "nutrition",
        },
      ],
      sections: [],
    },
  ];

  const anyResponse = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "nutrition",
    taxonomy: ["food", "nutrition"],
    taxonomyMatch: "any",
  });

  expect(anyResponse.results.map((result) => result.id).sort()).toEqual([
    "blog-both",
    "blog-one",
  ]);

  const allResponse = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "nutrition",
    taxonomy: ["food", "nutrition"],
    taxonomyMatch: "all",
  });

  expect(allResponse.results.map((result) => result.id)).toEqual(["blog-both"]);

  const idResponse = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "nutrition",
    taxonomy: ["taxonomy-nutrition"],
    taxonomyMatch: "any",
  });

  expect(idResponse.results).toHaveLength(2);
});

it("sorts newest/oldest using raw ISO timestamps and paginates safely", async () => {
  documents = [
    {
      _id: "blog-old",
      _type: "blog",
      title: "Nutrition Old",
      locale: "us-en",
      slug: "old",
      summary: "Nutrition",
      publishedAt: "2026-08-01T12:00:00Z",
      sections: [],
    },
    {
      _id: "blog-new",
      _type: "blog",
      title: "Nutrition New",
      locale: "us-en",
      slug: "new",
      summary: "Nutrition",
      publishedAt: "2026-09-01T12:00:00Z",
      sections: [],
    },
  ];

  const newest = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "nutrition",
    sort: "newest",
    pageSize: 1,
    page: 1,
  });

  expect(newest.results[0]?.id).toBe("blog-new");
  expect(newest.total).toBe(2);
  expect(newest.totalPages).toBe(2);

  const oldest = await searchContent({
    siteId: "site-proti",
    locale: "us-en",
    query: "nutrition",
    sort: "oldest",
  });

  expect(oldest.results.map((result) => result.id)).toEqual([
    "blog-old",
    "blog-new",
  ]);
});
