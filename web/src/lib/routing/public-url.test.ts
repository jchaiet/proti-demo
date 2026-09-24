import { describe, expect, it } from "vitest";

import {
  buildLocaleLinks,
  buildLocalePublicPath,
  getSiteOrigin,
  publicUrlsMatch,
  resolveCanonicalPublicUrl,
} from "./public-url";

describe("public URL helpers", () => {
  it("omits the default locale and prefixes non-default locales", () => {
    expect(
      buildLocalePublicPath({
        locale: "us-en",
        defaultLocale: "us-en",
        path: "/products/widget/",
      }),
    ).toBe("/products/widget");

    expect(
      buildLocalePublicPath({
        locale: "us-es",
        defaultLocale: "us-en",
        path: "/products/widget/",
      }),
    ).toBe("/us-es/products/widget");

    expect(
      buildLocalePublicPath({
        locale: "us-es",
        defaultLocale: "us-en",
        path: "/",
      }),
    ).toBe("/us-es");
  });

  it("uses https for public hosts and http for local development hosts", () => {
    expect(getSiteOrigin(["example.com"])).toBe("https://example.com");
    expect(getSiteOrigin(["localhost:3000"])).toBe("http://localhost:3000");
  });

  it("builds locale hrefs and hreflang values from one route contract", () => {
    expect(
      buildLocaleLinks({
        routePath: "/products/widget",
        defaultLocale: "us-en",
        locales: [{ code: "us-en" }, { code: "us-es" }],
        domains: ["example.com"],
      }),
    ).toEqual({
      localeHrefs: {
        "us-en": "/products/widget",
        "us-es": "/us-es/products/widget",
      },
      languageAlternates: {
        "en-US": "https://example.com/products/widget",
        "es-US": "https://example.com/us-es/products/widget",
        "x-default": "https://example.com/products/widget",
      },
    });
  });

  it("can limit alternate links to locales with a real equivalent", () => {
    expect(
      buildLocaleLinks({
        routePath: "/products/widget",
        defaultLocale: "us-en",
        locales: [{ code: "us-en" }, { code: "us-es" }],
        availableLocales: ["us-en"],
        domains: ["example.com"],
      }).languageAlternates,
    ).toEqual({
      "en-US": "https://example.com/products/widget",
      "x-default": "https://example.com/products/widget",
    });
  });

  it("treats trailing slash variants as the same canonical URL", () => {
    expect(
      publicUrlsMatch(
        "https://example.com/products/widget",
        "https://example.com/products/widget/",
      ),
    ).toBe(true);
  });

  it("identifies an off-route canonical override", () => {
    expect(
      resolveCanonicalPublicUrl({
        origin: "https://example.com",
        publicPath: "/products/widget",
        canonicalUrl: "https://canonical.example.com/widget",
      }),
    ).toEqual({
      publicUrl: "https://example.com/products/widget",
      canonical: "https://canonical.example.com/widget",
      isSelfCanonical: false,
    });
  });
});
