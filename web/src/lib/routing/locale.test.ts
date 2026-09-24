import { describe, expect, it } from "vitest";

import type { Site } from "@/sanity/types";

import {
  resolveLocale,
  resolveLocaleCodeFromPathname,
  segmentsToPath,
  siteLocaleToLanguageTag,
} from "./locale";

const site: Site = {
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
      label: "Spanish",
    },
    {
      code: "ca-fr",
      label: "French",
    },
  ],
};

describe("resolveLocale", () => {
  it("uses the default locale when the path has no locale prefix", () => {
    expect(resolveLocale(site, ["products", "widget"])).toEqual({
      locale: "us-en",
      pageSegments: ["products", "widget"],
      localeWasExplicit: false,
      explicitDefaultLocale: false,
    });
  });

  it("removes a supported non-default locale prefix", () => {
    expect(resolveLocale(site, ["us-es", "products", "widget"])).toEqual({
      locale: "us-es",
      pageSegments: ["products", "widget"],
      localeWasExplicit: true,
      explicitDefaultLocale: false,
    });
  });

  it("detects an explicitly-prefixed default locale", () => {
    expect(resolveLocale(site, ["us-en", "products", "widget"])).toEqual({
      locale: "us-en",
      pageSegments: ["products", "widget"],
      localeWasExplicit: true,
      explicitDefaultLocale: true,
    });
  });

  it("does not mistake an unsupported first segment for a locale", () => {
    expect(resolveLocale(site, ["uk-en", "products"])).toEqual({
      locale: "us-en",
      pageSegments: ["uk-en", "products"],
      localeWasExplicit: false,
      explicitDefaultLocale: false,
    });
  });
});

describe("segmentsToPath", () => {
  it("returns / for the homepage", () => {
    expect(segmentsToPath([])).toBe("/");
  });

  it("joins page hierarchy segments", () => {
    expect(segmentsToPath(["products", "widget"])).toBe("/products/widget");
  });
});

describe("siteLocaleToLanguageTag", () => {
  it.each([
    ["us-en", "en-US"],
    ["us-es", "es-US"],
    ["ca-fr", "fr-CA"],
    ["en", "en"],
    ["", "en"],
  ])("converts %s to %s", (locale, expected) => {
    expect(siteLocaleToLanguageTag(locale)).toBe(expected);
  });
});

describe("resolveLocaleCodeFromPathname", () => {
  const locales = ["us-en", "us-es", "ca-fr"];

  it("uses the Site default locale for an unprefixed route", () => {
    expect(
      resolveLocaleCodeFromPathname({
        pathname: "/products/widget",
        defaultLocale: "us-en",
        locales,
      }),
    ).toBe("us-en");
  });

  it("uses a supported locale prefix", () => {
    expect(
      resolveLocaleCodeFromPathname({
        pathname: "/us-es/products/widget",
        defaultLocale: "us-en",
        locales,
      }),
    ).toBe("us-es");
  });

  it("uses the default locale for /", () => {
    expect(
      resolveLocaleCodeFromPathname({
        pathname: "/",
        defaultLocale: "us-en",
        locales,
      }),
    ).toBe("us-en");
  });

  it("does not accept an unsupported locale prefix", () => {
    expect(
      resolveLocaleCodeFromPathname({
        pathname: "/uk-en/products/widget",
        defaultLocale: "us-en",
        locales,
      }),
    ).toBe("us-en");
  });
});
