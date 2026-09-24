import type { Site } from "@/sanity/types";

export type ResolvedLocale = {
  locale: string;
  pageSegments: string[];
  localeWasExplicit: boolean;
  explicitDefaultLocale: boolean;
};

export function resolveLocale(site: Site, segments: string[]): ResolvedLocale {
  const firstSegment = segments[0];

  const supportedLocales = new Set(site.locales.map((locale) => locale.code));

  if (firstSegment && supportedLocales.has(firstSegment)) {
    return {
      locale: firstSegment,

      pageSegments: segments.slice(1),

      localeWasExplicit: true,

      explicitDefaultLocale: firstSegment === site.defaultLocale,
    };
  }

  return {
    locale: site.defaultLocale,
    pageSegments: segments,
    localeWasExplicit: false,
    explicitDefaultLocale: false,
  };
}

export function segmentsToPath(segments: string[]): string {
  if (segments.length === 0) {
    return "/";
  }

  return `/${segments.join("/")}`;
}

export function siteLocaleToLanguageTag(locale: string): string {
  const parts = locale.split("-").filter(Boolean);

  /*
   * Proti Site locale codes use region-language ordering:
   *
   * us-en -> en-US
   * us-es -> es-US
   * ca-fr -> fr-CA
   *
   * A single-part code such as "en" remains valid as-is.
   */
  if (parts.length === 2) {
    const [region, language] = parts;

    if (region && language) {
      return `${language.toLowerCase()}-${region.toUpperCase()}`;
    }
  }

  return locale || "en";
}

export function resolveLocaleCodeFromPathname({
  pathname,
  defaultLocale,
  locales,
}: {
  pathname: string;
  defaultLocale: string;
  locales: string[];
}): string {
  const firstSegment = pathname.split("/").filter(Boolean)[0];

  if (firstSegment && locales.includes(firstSegment)) {
    return firstSegment;
  }

  return defaultLocale;
}
