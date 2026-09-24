import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  resolvePageIdBySegments: vi.fn(),
  resolvePageSegmentsById: vi.fn(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: mocks.fetch,
  },
}));

vi.mock("@/sanity/queries/page", () => ({
  resolvePageIdBySegments: mocks.resolvePageIdBySegments,
  resolvePageSegmentsById: mocks.resolvePageSegmentsById,
}));

import { resolveDocumentTranslations } from "./translation";

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.resolvePageIdBySegments.mockReset();
  mocks.resolvePageSegmentsById.mockReset();
});

describe("resolveDocumentTranslations - Page", () => {
  it("returns exact locale equivalents and x-default when translations exist", async () => {
    mocks.fetch.mockResolvedValueOnce({
      domains: ["example.com"],
      locales: [
        {
          code: "us-en",
        },
        {
          code: "us-es",
        },
      ],
    });

    mocks.resolvePageSegmentsById.mockResolvedValue(["products", "widget"]);

    mocks.resolvePageIdBySegments.mockImplementation(
      async (_siteId: string, locale: string) =>
        locale === "us-en" ? "page-en" : "page-es",
    );

    const result = await resolveDocumentTranslations({
      siteId: "site-proti",
      documentId: "page-en",
      documentType: "page",
      defaultLocale: "us-en",
      domains: ["example.com"],
    });

    expect(result.localeHrefs).toEqual({
      "us-en": "/products/widget",
      "us-es": "/us-es/products/widget",
    });

    expect(result.languageAlternates).toEqual({
      "en-US": "https://example.com/products/widget",
      "es-US": "https://example.com/us-es/products/widget",
      "x-default": "https://example.com/products/widget",
    });
  });

  it("does not advertise a locale whose exact Page equivalent is missing", async () => {
    mocks.fetch.mockResolvedValueOnce({
      domains: ["example.com"],
      locales: [
        {
          code: "us-en",
        },
        {
          code: "us-es",
        },
      ],
    });

    mocks.resolvePageSegmentsById.mockResolvedValue(["products", "widget"]);

    mocks.resolvePageIdBySegments.mockImplementation(
      async (_siteId: string, locale: string) =>
        locale === "us-en" ? "page-en" : null,
    );

    const result = await resolveDocumentTranslations({
      siteId: "site-proti",
      documentId: "page-en",
      documentType: "page",
      defaultLocale: "us-en",
      domains: ["example.com"],
    });

    expect(result.localeHrefs).toEqual({
      "us-en": "/products/widget",
    });

    expect(result.languageAlternates).toEqual({
      "en-US": "https://example.com/products/widget",
      "x-default": "https://example.com/products/widget",
    });

    expect(result.localeHrefs["us-es"]).toBeUndefined();
    expect(result.languageAlternates["es-US"]).toBeUndefined();
  });
});

describe("resolveDocumentTranslations - Blog", () => {
  it("uses the same Blog slug across locale-prefixed routes", async () => {
    mocks.fetch
      .mockResolvedValueOnce({
        domains: ["example.com"],
        locales: [
          {
            code: "us-en",
          },
          {
            code: "us-es",
          },
        ],
      })
      .mockResolvedValueOnce({
        slug: "nutrition-basics",
      })
      .mockResolvedValueOnce({
        _id: "blog-en",
      })
      .mockResolvedValueOnce({
        _id: "blog-es",
      });

    const result = await resolveDocumentTranslations({
      siteId: "site-proti",
      documentId: "blog-en",
      documentType: "blog",
      defaultLocale: "us-en",
      domains: ["example.com"],
    });

    expect(result.localeHrefs).toEqual({
      "us-en": "/blog/nutrition-basics",
      "us-es": "/us-es/blog/nutrition-basics",
    });

    expect(result.languageAlternates).toEqual({
      "en-US": "https://example.com/blog/nutrition-basics",
      "es-US": "https://example.com/us-es/blog/nutrition-basics",
      "x-default": "https://example.com/blog/nutrition-basics",
    });
  });

  it("omits a missing Blog translation", async () => {
    mocks.fetch
      .mockResolvedValueOnce({
        domains: ["example.com"],
        locales: [
          {
            code: "us-en",
          },
          {
            code: "us-es",
          },
        ],
      })
      .mockResolvedValueOnce({
        slug: "nutrition-basics",
      })
      .mockResolvedValueOnce({
        _id: "blog-en",
      })
      .mockResolvedValueOnce(null);

    const result = await resolveDocumentTranslations({
      siteId: "site-proti",
      documentId: "blog-en",
      documentType: "blog",
      defaultLocale: "us-en",
      domains: ["example.com"],
    });

    expect(result.localeHrefs).toEqual({
      "us-en": "/blog/nutrition-basics",
    });

    expect(result.languageAlternates["es-US"]).toBeUndefined();
  });
});
