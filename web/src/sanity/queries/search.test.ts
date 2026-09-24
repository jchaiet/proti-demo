import { describe, expect, it } from "vitest";

import {
  SEARCH_CONTENT_QUERY,
  SEARCH_SITE_SETTINGS_QUERY,
  SEARCH_TAXONOMY_QUERY,
} from "./search";

describe("Search GROQ contract", () => {
  it("scopes searchable Page/Blog content to both Site and locale", () => {
    expect(SEARCH_CONTENT_QUERY).toContain("site._ref == $siteId");
    expect(SEARCH_CONTENT_QUERY).toContain("locale == $locale");
    expect(SEARCH_CONTENT_QUERY).toContain('_type in ["page", "blog"]');
  });

  it("keeps shared Taxonomy Site-scoped while localizing projected titles", () => {
    expect(SEARCH_TAXONOMY_QUERY).toContain("site._ref == $siteId");

    /*
     * Taxonomy is shared across locales, so the GROQ selector itself
     * must not filter Taxonomy documents by locale.
     *
     * `locale == $locale` is still expected inside translations[]
     * because that is how the localized title is projected.
     */
    const selector = SEARCH_TAXONOMY_QUERY.split("]{", 1)[0] ?? "";

    expect(selector).not.toContain("locale == $locale");

    expect(SEARCH_TAXONOMY_QUERY).toContain(
      "translations[\n        locale == $locale",
    );
  });

  it("projects localized Author name and job title", () => {
    expect(SEARCH_CONTENT_QUERY).toContain(
      "translations[\n            locale == $locale\n          ][0].name",
    );
    expect(SEARCH_CONTENT_QUERY).toContain(
      "translations[\n            locale == $locale\n          ][0].jobTitle",
    );
  });

  it("projects full Blog image crop/hotspot data instead of a raw asset URL", () => {
    expect(SEARCH_CONTENT_QUERY).toContain('"crop": mainImage.crop');
    expect(SEARCH_CONTENT_QUERY).toContain('"hotspot": mainImage.hotspot');
    expect(SEARCH_CONTENT_QUERY).not.toContain("asset->url");
  });

  it("resolves locale-specific default indexing from Site settings", () => {
    expect(SEARCH_SITE_SETTINGS_QUERY).toContain(
      "seoDefaults[\n          locale == $locale",
    );
  });
});
