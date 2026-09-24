import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headersGet: vi.fn(),
  draftMode: vi.fn(),

  sanityFetch: vi.fn(),

  resolveSiteByHostCached: vi.fn(),
  resolvePageBySegments: vi.fn(),

  getAuthorSlug: vi.fn(),
  getBlogSlug: vi.fn(),
  getBlogTaxonomySegments: vi.fn(),
  isSearchRoute: vi.fn(),
  resolveRoute: vi.fn(),

  getAuthorBySlug: vi.fn(),
  buildAuthorLocaleLinks: vi.fn(),

  getBlogBySlug: vi.fn(),

  getBlogTaxonomyPage: vi.fn(),
  buildBlogTaxonomyLocaleLinks: vi.fn(),

  resolveDocumentTranslations: vi.fn(),
  resolveStructuredDataSite: vi.fn(),

  resolveSanityImagePreset: vi.fn(),

  notFound: vi.fn(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: mocks.headersGet,
  }),
  draftMode: mocks.draftMode,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
  permanentRedirect: mocks.permanentRedirect,
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: mocks.sanityFetch,
  },
}));

vi.mock("@/sanity/queries/site", () => ({
  resolveSiteByHostCached: mocks.resolveSiteByHostCached,
}));

vi.mock("@/sanity/queries/page", () => ({
  resolvePageBySegments: mocks.resolvePageBySegments,
}));

vi.mock("@/cms/resolvers/route", () => ({
  getAuthorSlug: mocks.getAuthorSlug,
  getBlogSlug: mocks.getBlogSlug,
  getBlogTaxonomySegments: mocks.getBlogTaxonomySegments,
  isSearchRoute: mocks.isSearchRoute,
  resolveRoute: mocks.resolveRoute,
}));

vi.mock("@/cms/resolvers/author", () => ({
  getAuthorBySlug: mocks.getAuthorBySlug,
  buildAuthorLocaleLinks: mocks.buildAuthorLocaleLinks,
}));

vi.mock("@/cms/resolvers/blog", () => ({
  getBlogBySlug: mocks.getBlogBySlug,
}));

vi.mock("@/cms/resolvers/blog-taxonomy", () => ({
  getBlogTaxonomyPage: mocks.getBlogTaxonomyPage,
  buildBlogTaxonomyLocaleLinks: mocks.buildBlogTaxonomyLocaleLinks,
}));

vi.mock("@/cms/resolvers/translation", () => ({
  resolveDocumentTranslations: mocks.resolveDocumentTranslations,
}));

vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImagePreset: mocks.resolveSanityImagePreset,
}));

vi.mock("@/cms/resolvers/structured-data", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/cms/resolvers/structured-data")>();

  return {
    ...actual,
    resolveStructuredDataSite: mocks.resolveStructuredDataSite,
  };
});

/*
 * Keep the route's actual StructuredData component, metadata resolver,
 * URL helpers, locale helpers, and structured-data builders in this test.
 * Only visual/content components are replaced so the test can focus on the
 * final SEO output contract without pulling Mino UI/CSS into server rendering.
 */
vi.mock("@/components/SiteLayout", () => ({
  SiteLayout: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/BlockRenderer", () => ({
  BlockRenderer: () => <div data-testid="block-renderer" />,
}));

vi.mock("@/components/Author/AuthorTemplate", () => ({
  AuthorTemplate: () => <div data-testid="author-template" />,
}));

vi.mock("@/components/Blog/BlogTemplate", () => ({
  BlogTemplate: () => <div data-testid="blog-template" />,
}));

vi.mock("@/components/Blog/BlogTaxonomyTemplate", () => ({
  BlogTaxonomyTemplate: () => <div data-testid="taxonomy-template" />,
}));

vi.mock("@/components/Search", () => ({
  SearchTemplate: () => <div data-testid="search-template" />,
}));

import Page, { generateMetadata } from "./page";

const site = {
  _id: "site-proti",
  name: "Proti",
  key: "proti",
  domains: ["example.com"],
  defaultLocale: "us-en",
  locales: [
    {
      code: "us-en",
      label: "English",
    },
    {
      code: "us-es",
      label: "Español",
    },
  ],
};

const structuredSite = {
  name: "Proti",
  origin: "https://example.com",
  locales: ["us-en", "us-es"],
  organization: {
    name: "Proti Health",
    legalName: "Proti Health, Inc.",
    description: "Health information from Proti.",
  },
};

const englishTranslations = {
  localeHrefs: {
    "us-en": "/products/widget",
    "us-es": "/us-es/products/widget",
  },
  languageAlternates: {
    "en-US": "https://example.com/products/widget",
    "es-US": "https://example.com/us-es/products/widget",
    "x-default": "https://example.com/products/widget",
  },
};

const spanishTranslations = {
  localeHrefs: {
    "us-en": "/products/widget",
    "us-es": "/us-es/products/widget",
  },
  languageAlternates: {
    "en-US": "https://example.com/products/widget",
    "es-US": "https://example.com/us-es/products/widget",
    "x-default": "https://example.com/products/widget",
  },
};

const author = {
  _id: "author-jane",
  _type: "author" as const,
  siteId: "site-proti",
  slug: "jane-smith",
  name: "Jane Smith",
  jobTitle: "Registered Dietitian",
  bio: "Nutrition expert.",
  expertise: ["Nutrition", "Metabolic health"],
  credentials: [
    {
      name: "Registered Dietitian Nutritionist",
      category: "Registration",
      identifier: "RDN-123",
      recognizedBy: "Commission on Dietetic Registration",
    },
  ],
  imageUrl: "https://cdn.example.com/jane.jpg",
  imageAlt: "Jane Smith",
  sameAs: ["https://www.linkedin.com/in/jane-smith"],
};

const reviewer = {
  _id: "author-reviewer",
  _type: "author" as const,
  siteId: "site-proti",
  slug: "alex-reviewer",
  name: "Alex Reviewer",
  jobTitle: "Medical Reviewer",
  bio: "Clinical reviewer.",
};

const blog = {
  _id: "blog-nutrition",
  _type: "blog" as const,
  siteId: "site-proti",
  locale: "us-en",
  title: "Nutrition Basics",
  summary: "A practical guide to nutrition.",
  slug: "nutrition-basics",
  publishedAt: "2026-09-01T12:00:00Z",
  lastModifiedAt: "2026-09-21T15:30:00Z",
  reviewedAt: "2026-09-22T08:00:00Z",
  imageUrl: "https://cdn.example.com/nutrition.jpg",
  imageAlt: "Healthy food",
  author,
  reviewer,
  sources: [
    {
      title: "Nutrition Guidelines",
      publisher: "Example Health Organization",
      publicationDate: "2026-08-01",
      url: "https://example.org/guidelines",
    },
  ],
  taxonomy: [
    {
      _id: "taxonomy-nutrition",
      _type: "taxonomy" as const,
      title: "Nutrition",
      slug: "nutrition",
    },
    {
      _id: "taxonomy-metabolic-health",
      _type: "taxonomy" as const,
      title: "Metabolic Health",
      slug: "metabolic-health",
    },
  ],
};

function createSiteSeoRecord(locale: string) {
  const spanish = locale === "us-es";

  return {
    _id: "site-proti",
    name: "Proti",
    domains: ["example.com"],
    defaultLocale: "us-en",
    defaults: {
      locale,
      siteTitle: spanish ? "Proti Salud" : "Proti Health",
      titleTemplate: spanish ? "%s | Proti Salud" : "%s | Proti Health",
      metaDescription: spanish
        ? "Descripción predeterminada del sitio."
        : "Default site description.",
      indexing: "index",
      following: "follow",
    },
  };
}

function pageProps(path: string[]) {
  return {
    params: Promise.resolve({ path }),
    searchParams: Promise.resolve({}),
  };
}

function getJsonLdGraph(html: string): Array<Record<string, unknown>> {
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );

  expect(match).not.toBeNull();

  const parsed = JSON.parse(match?.[1] ?? "{}") as {
    "@graph"?: Array<Record<string, unknown>>;
  };

  expect(parsed["@graph"]).toBeDefined();

  return parsed["@graph"] ?? [];
}

function getGraphNode(
  graph: Array<Record<string, unknown>>,
  type: string,
): Record<string, unknown> {
  const node = graph.find((item) => item["@type"] === type);

  expect(node, `Expected JSON-LD graph to contain ${type}`).toBeDefined();

  return node ?? {};
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.headersGet.mockImplementation((name: string) =>
    name === "host" ? "example.com" : null,
  );

  mocks.draftMode.mockResolvedValue({ isEnabled: false });

  mocks.resolveSiteByHostCached.mockResolvedValue(site);

  mocks.getAuthorSlug.mockReturnValue(null);
  mocks.getBlogSlug.mockReturnValue(null);
  mocks.getBlogTaxonomySegments.mockReturnValue(null);
  mocks.isSearchRoute.mockReturnValue(false);

  mocks.resolveDocumentTranslations.mockResolvedValue(englishTranslations);

  mocks.buildAuthorLocaleLinks.mockReturnValue({
    localeHrefs: {
      "us-en": "/authors/jane-smith",
      "us-es": "/us-es/authors/jane-smith",
    },
    languageAlternates: {
      "en-US": "https://example.com/authors/jane-smith",
      "es-US": "https://example.com/us-es/authors/jane-smith",
      "x-default": "https://example.com/authors/jane-smith",
    },
  });

  mocks.resolveStructuredDataSite.mockResolvedValue(structuredSite);

  mocks.resolveSanityImagePreset.mockReturnValue(undefined);

  mocks.sanityFetch.mockImplementation(
    (_query: string, params?: Record<string, unknown>) =>
      Promise.resolve(createSiteSeoRecord(String(params?.locale ?? "us-en"))),
  );

  mocks.notFound.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });

  mocks.redirect.mockImplementation((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  });

  mocks.permanentRedirect.mockImplementation((destination: string) => {
    throw new Error(`NEXT_PERMANENT_REDIRECT:${destination}`);
  });
});

describe("rendered SEO metadata output", () => {
  it("inherits Site + Locale SEO defaults on an unprefixed default-locale Page", async () => {
    mocks.resolvePageBySegments.mockResolvedValue({
      _id: "page-widget",
      title: "Widget",
      locale: "us-en",
    });

    const metadata = await generateMetadata(pageProps(["products", "widget"]));

    expect(metadata).toMatchObject({
      title: "Widget | Proti Health",
      description: "Default site description.",
      alternates: {
        canonical: "https://example.com/products/widget",
        languages: englishTranslations.languageAlternates,
      },
      robots: {
        index: true,
        follow: true,
      },
      openGraph: {
        type: "website",
        url: "https://example.com/products/widget",
        locale: "en_US",
        alternateLocale: ["es_US"],
      },
    });
  });

  it("emits localized canonical, hreflang, robots, Open Graph, and Twitter metadata for a translated Page", async () => {
    mocks.resolvePageBySegments.mockResolvedValue({
      _id: "page-widget-es",
      title: "Widget",
      locale: "us-es",
      seo: {
        metaTitle: "Widget en Español",
        metaDescription: "Descripción del widget.",
      },
    });

    mocks.resolveDocumentTranslations.mockResolvedValue(spanishTranslations);

    const metadata = await generateMetadata(
      pageProps(["us-es", "products", "widget"]),
    );

    expect(metadata).toMatchObject({
      title: "Widget en Español | Proti Salud",
      description: "Descripción del widget.",
      alternates: {
        canonical: "https://example.com/us-es/products/widget",
        languages: spanishTranslations.languageAlternates,
      },
      robots: {
        index: true,
        follow: true,
      },
      openGraph: {
        type: "website",
        title: "Widget en Español | Proti Salud",
        description: "Descripción del widget.",
        url: "https://example.com/us-es/products/widget",
        locale: "es_US",
        alternateLocale: ["en_US"],
      },
      twitter: {
        card: "summary",
        title: "Widget en Español | Proti Salud",
        description: "Descripción del widget.",
      },
    });
  });

  it("suppresses hreflang when a Page canonicals elsewhere and honors explicit noindex/nofollow", async () => {
    mocks.resolvePageBySegments.mockResolvedValue({
      _id: "page-widget",
      title: "Widget",
      locale: "us-en",
      seo: {
        metaTitle: "Canonical Widget",
        canonicalUrl: "https://canonical.example.org/widget",
        indexing: "noindex",
        following: "nofollow",
      },
    });

    const metadata = await generateMetadata(pageProps(["products", "widget"]));

    expect(metadata.alternates).toEqual({
      canonical: "https://canonical.example.org/widget",
    });

    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
    });

    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: "https://canonical.example.org/widget",
    });
  });

  it("emits article metadata with editorial dates, Author URL, and taxonomy tags for Blog routes", async () => {
    mocks.getBlogSlug.mockReturnValue("nutrition-basics");
    mocks.getBlogBySlug.mockResolvedValue(blog);
    mocks.resolveDocumentTranslations.mockResolvedValue({
      localeHrefs: {
        "us-en": "/blog/nutrition-basics",
        "us-es": "/us-es/blog/nutrition-basics",
      },
      languageAlternates: {
        "en-US": "https://example.com/blog/nutrition-basics",
        "es-US": "https://example.com/us-es/blog/nutrition-basics",
        "x-default": "https://example.com/blog/nutrition-basics",
      },
    });

    const metadata = await generateMetadata(
      pageProps(["blog", "nutrition-basics"]),
    );

    expect(metadata).toMatchObject({
      title: "Nutrition Basics | Proti Health",
      description: "A practical guide to nutrition.",
      alternates: {
        canonical: "https://example.com/blog/nutrition-basics",
      },
      openGraph: {
        type: "article",
        url: "https://example.com/blog/nutrition-basics",
        publishedTime: "2026-09-01T12:00:00Z",
        modifiedTime: "2026-09-21T15:30:00Z",
        authors: ["https://example.com/authors/jane-smith"],
        tags: ["Nutrition", "Metabolic Health"],
      },
      twitter: {
        card: "summary_large_image",
        images: ["https://cdn.example.com/nutrition.jpg"],
      },
    });
  });

  it("keeps Search routes canonical but explicitly noindex/follow", async () => {
    mocks.isSearchRoute.mockReturnValue(true);

    const metadata = await generateMetadata(pageProps(["search"]));

    expect(metadata.alternates?.canonical).toBe("https://example.com/search");
    expect(metadata.robots).toEqual({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    });
  });
});

describe("rendered JSON-LD output", () => {
  it("renders one Schema.org graph for a normal Page with Organization, WebSite, WebPage, and BreadcrumbList", async () => {
    mocks.resolveRoute.mockResolvedValue({
      type: "page",
      page: {
        _id: "page-widget",
        title: "Widget",
        locale: "us-en",
        seo: {
          metaDescription: "Widget description.",
        },
        sections: [],
      },
    });

    const element = await Page(pageProps(["products", "widget"]));
    const html = renderToStaticMarkup(element);
    const graph = getJsonLdGraph(html);

    expect(graph.map((item) => item["@type"])).toEqual([
      "Organization",
      "WebSite",
      "WebPage",
      "BreadcrumbList",
    ]);

    expect(getGraphNode(graph, "WebPage")).toMatchObject({
      "@id": "https://example.com/products/widget#webpage",
      url: "https://example.com/products/widget",
      name: "Widget",
      description: "Widget description.",
      inLanguage: "en-US",
      isPartOf: {
        "@id": "https://example.com/#website",
      },
      publisher: {
        "@id": "https://example.com/#organization",
      },
      breadcrumb: {
        "@id": "https://example.com/products/widget#breadcrumb",
      },
    });
  });

  it("renders Author routes as ProfilePage + Person and connects the entities by stable @id", async () => {
    mocks.resolveRoute.mockResolvedValue({
      type: "author",
      authorPage: {
        locale: "us-en",
        author,
        articles: [],
      },
    });

    const element = await Page(pageProps(["authors", "jane-smith"]));
    const html = renderToStaticMarkup(element);
    const graph = getJsonLdGraph(html);

    const profilePage = getGraphNode(graph, "ProfilePage");
    const person = getGraphNode(graph, "Person");

    expect(profilePage).toMatchObject({
      "@id": "https://example.com/authors/jane-smith#webpage",
      url: "https://example.com/authors/jane-smith",
      name: "Jane Smith",
      mainEntity: {
        "@id": "https://example.com/#person-jane-smith",
      },
    });

    expect(person).toMatchObject({
      "@id": "https://example.com/#person-jane-smith",
      name: "Jane Smith",
      jobTitle: "Registered Dietitian",
      mainEntityOfPage: {
        "@id": "https://example.com/authors/jane-smith#webpage",
      },
    });
  });

  it("renders BlogPosting, Author, Reviewer, WebPage, and citation relationships in one graph", async () => {
    mocks.resolveRoute.mockResolvedValue({
      type: "blog",
      blog,
    });

    mocks.resolveDocumentTranslations.mockResolvedValue({
      localeHrefs: {
        "us-en": "/blog/nutrition-basics",
      },
      languageAlternates: {
        "en-US": "https://example.com/blog/nutrition-basics",
        "x-default": "https://example.com/blog/nutrition-basics",
      },
    });

    const element = await Page(pageProps(["blog", "nutrition-basics"]));
    const html = renderToStaticMarkup(element);
    const graph = getJsonLdGraph(html);

    expect(graph.filter((item) => item["@type"] === "Person")).toHaveLength(2);

    const webPage = getGraphNode(graph, "WebPage");
    const posting = getGraphNode(graph, "BlogPosting");

    expect(webPage).toMatchObject({
      "@id": "https://example.com/blog/nutrition-basics#webpage",
      mainEntity: {
        "@id": "https://example.com/blog/nutrition-basics#blogposting",
      },
      reviewedBy: {
        "@id": "https://example.com/#person-alex-reviewer",
      },
      lastReviewed: "2026-09-22",
      primaryImageOfPage: {
        "@id": "https://example.com/blog/nutrition-basics#primaryimage",
      },
    });

    expect(posting).toMatchObject({
      "@id": "https://example.com/blog/nutrition-basics#blogposting",
      headline: "Nutrition Basics",
      datePublished: "2026-09-01T12:00:00Z",
      dateModified: "2026-09-21T15:30:00Z",
      author: {
        "@id": "https://example.com/#person-jane-smith",
      },
      keywords: ["Nutrition", "Metabolic Health"],
      citation: [
        {
          "@type": "CreativeWork",
          name: "Nutrition Guidelines",
          url: "https://example.org/guidelines",
        },
      ],
    });
  });

  it("does not emit JSON-LD from draft content while Visual Editing is active", async () => {
    mocks.draftMode.mockResolvedValue({ isEnabled: true });

    mocks.resolveRoute.mockResolvedValue({
      type: "page",
      page: {
        _id: "drafts.page-widget",
        title: "Unpublished Widget Title",
        locale: "us-en",
        sections: [],
      },
    });

    const element = await Page(pageProps(["products", "widget"]));
    const html = renderToStaticMarkup(element);

    expect(html).not.toContain('type="application/ld+json"');
  });
});
