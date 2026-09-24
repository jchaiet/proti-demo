import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  resolveSanityImagePreset: vi.fn(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: mocks.fetch,
  },
}));

vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImagePreset: mocks.resolveSanityImagePreset,
}));

import { buildSeoMetadata } from "./seo";

const siteRecord = {
  _id: "site-proti",
  name: "Proti",
  domains: ["example.com"],
  defaultLocale: "us-en",
  defaults: {
    locale: "us-en",
    siteTitle: "Proti Health",
    titleTemplate: "%s | Proti Health",
    metaDescription: "Default Site description.",
    indexing: "index",
    following: "follow",
    socialImage: {
      asset: {
        _type: "reference",
        _ref: "image-site-social",
      },
      alt: "Default social image",
    },
  },
};

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.resolveSanityImagePreset.mockReset();

  mocks.fetch.mockResolvedValue(siteRecord);

  mocks.resolveSanityImagePreset.mockImplementation(
    (_image: unknown, preset: string) =>
      preset === "social"
        ? "https://cdn.example.com/site-social.jpg"
        : undefined,
  );
});

it("uses locale Site title directly for a Homepage without an explicit meta title", async () => {
  const metadata = await buildSeoMetadata({
    siteId: "site-proti",
    locale: "us-en",
    publicPath: "/",
    title: "Homepage document title",
    isHomepage: true,
  });

  expect(metadata.title).toBe("Proti Health");
  expect(metadata.description).toBe("Default Site description.");
  expect(metadata.alternates?.canonical).toBe("https://example.com/");
});

it("applies the Site title template to normal documents", async () => {
  const metadata = await buildSeoMetadata({
    siteId: "site-proti",
    locale: "us-en",
    publicPath: "/products/widget",
    title: "Widget",
  });

  expect(metadata.title).toBe("Widget | Proti Health");
  expect(metadata.alternates?.canonical).toBe(
    "https://example.com/products/widget",
  );
});

it("prefers authored SEO title/description/canonical overrides", async () => {
  const metadata = await buildSeoMetadata({
    siteId: "site-proti",
    locale: "us-en",
    publicPath: "/products/widget",
    title: "Widget",
    description: "Content description",
    seo: {
      metaTitle: "Custom Widget SEO",
      metaDescription: "Custom SEO description",
      canonicalUrl: "https://canonical.example.com/widget",
    },
  });

  expect(metadata.title).toBe("Custom Widget SEO | Proti Health");
  expect(metadata.description).toBe("Custom SEO description");
  expect(metadata.alternates?.canonical).toBe(
    "https://canonical.example.com/widget",
  );
});

it("emits hreflang/x-default and Open Graph alternate locales consistently", async () => {
  const languageAlternates = {
    "en-US": "https://example.com/products/widget",
    "es-US": "https://example.com/us-es/products/widget",
    "fr-CA": "https://example.com/ca-fr/products/widget",
    "x-default": "https://example.com/products/widget",
  };

  const metadata = await buildSeoMetadata({
    siteId: "site-proti",
    locale: "us-es",
    publicPath: "/us-es/products/widget",
    title: "Widget",
    languageAlternates,
  });

  expect(metadata.alternates?.languages).toEqual(languageAlternates);

  expect(metadata.openGraph).toMatchObject({
    locale: "es_US",
    alternateLocale: ["en_US", "fr_CA"],
  });
});

it("inherits robots defaults and honors document-level noindex/nofollow overrides", async () => {
  const inherited = await buildSeoMetadata({
    siteId: "site-proti",
    locale: "us-en",
    publicPath: "/page",
    title: "Page",
  });

  expect(inherited.robots).toEqual({
    index: true,
    follow: true,
  });

  const overridden = await buildSeoMetadata({
    siteId: "site-proti",
    locale: "us-en",
    publicPath: "/private",
    title: "Private",
    seo: {
      indexing: "noindex",
      following: "nofollow",
    },
  });

  expect(overridden.robots).toEqual({
    index: false,
    follow: false,
  });
});

it("emits Blog article Open Graph fields, absolute Author URLs, and cleaned tags", async () => {
  const metadata = await buildSeoMetadata({
    siteId: "site-proti",
    locale: "us-en",
    publicPath: "/blog/nutrition",
    title: "Nutrition",
    type: "article",
    publishedAt: "2026-09-01T12:00:00Z",
    modifiedAt: "2026-09-02T12:00:00Z",
    articleAuthorUrls: ["/authors/jane-smith", " /authors/jane-smith "],
    articleTags: ["Nutrition", " Health ", "Nutrition", ""],
  });

  expect(metadata.openGraph).toMatchObject({
    type: "article",
    publishedTime: "2026-09-01T12:00:00Z",
    modifiedTime: "2026-09-02T12:00:00Z",
    authors: ["https://example.com/authors/jane-smith"],
    tags: ["Nutrition", "Health"],
  });
});

it("uses SEO image override before content and Site defaults", async () => {
  const metadata = await buildSeoMetadata({
    siteId: "site-proti",
    locale: "us-en",
    publicPath: "/blog/nutrition",
    title: "Nutrition",
    imageUrl: "/content-image.jpg",
    imageAlt: "Content image",
    seo: {
      socialImageUrl: "/seo-image.jpg",
      socialImageAlt: "SEO image",
    },
  });

  expect(metadata.openGraph).toMatchObject({
    images: [
      {
        url: "https://example.com/seo-image.jpg",
        alt: "SEO image",
      },
    ],
  });

  expect(metadata.twitter).toMatchObject({
    card: "summary_large_image",
    images: ["https://example.com/seo-image.jpg"],
  });
});

it("uses the hotspot-aware Site social preset as the final image fallback", async () => {
  const metadata = await buildSeoMetadata({
    siteId: "site-proti",
    locale: "us-en",
    publicPath: "/page",
    title: "Page",
  });

  expect(mocks.resolveSanityImagePreset).toHaveBeenCalledWith(
    siteRecord.defaults.socialImage,
    "social",
  );

  expect(metadata.openGraph).toMatchObject({
    images: [
      {
        url: "https://cdn.example.com/site-social.jpg",
        alt: "Default social image",
      },
    ],
  });
});

it("uses http for localhost Site domains", async () => {
  mocks.fetch.mockResolvedValue({
    ...siteRecord,
    domains: ["localhost:3000"],
  });

  const metadata = await buildSeoMetadata({
    siteId: "site-proti",
    locale: "us-en",
    publicPath: "/page",
    title: "Page",
  });

  expect(metadata.alternates?.canonical).toBe("http://localhost:3000/page");
});

it("returns empty metadata when the Site SEO record cannot be resolved", async () => {
  mocks.fetch.mockResolvedValue(null);

  await expect(
    buildSeoMetadata({
      siteId: "missing",
      locale: "us-en",
      publicPath: "/",
    }),
  ).resolves.toEqual({});
});

it("suppresses hreflang when an explicit canonical points away from the public route", async () => {
  const metadata = await buildSeoMetadata({
    siteId: "site-proti",
    locale: "us-en",
    publicPath: "/products/widget",
    title: "Widget",
    seo: {
      canonicalUrl: "https://canonical.example.com/widget",
    },
    languageAlternates: {
      "en-US": "https://example.com/products/widget",
      "es-US": "https://example.com/us-es/products/widget",
      "x-default": "https://example.com/products/widget",
    },
  });

  expect(metadata.alternates).toEqual({
    canonical: "https://canonical.example.com/widget",
  });

  expect(metadata.openGraph).toMatchObject({
    url: "https://canonical.example.com/widget",
  });

  expect(metadata.openGraph).not.toHaveProperty("alternateLocale");
});
