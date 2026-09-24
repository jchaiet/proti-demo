import type { ReactNode } from "react";

import type { CmsNavigationOverride } from "@/cms/types";

import {
  mapNavigationFooter,
  mapNavigationHeader,
} from "@/cms/mappers/navigation";

import { resolveNavigation } from "@/cms/resolvers/navigation";

import { resolveSiteLocales } from "@/sanity/queries/site";

import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

import styles from "./styles.module.css";

export interface SiteLayoutProps {
  siteId: string;
  locale: string;

  navigationOverride?: CmsNavigationOverride;

  homeHref?: string;

  /**
   * Exact translated Page / Blog URLs keyed by Site locale.
   *
   * Undefined means this is not a translated CMS document
   * (for example /search) and the utility may preserve the
   * application route while switching locale prefixes.
   */
  localeHrefs?: Record<string, string>;

  visualEditing?: boolean;

  children: ReactNode;
}

export async function SiteLayout({
  siteId,
  locale,
  navigationOverride,
  homeHref = "/",
  localeHrefs,
  visualEditing = false,
  children,
}: SiteLayoutProps) {
  const [navigation, localeConfig] = await Promise.all([
    resolveNavigation({
      siteId,
      locale,
      override: navigationOverride,
      visualEditing,
    }),

    resolveSiteLocales(siteId),
  ]);

  const [header, footer] = await Promise.all([
    mapNavigationHeader(navigation?.header),
    mapNavigationFooter(navigation?.footer),
  ]);

  const defaultLocale = localeConfig?.defaultLocale ?? locale;

  const locales = localeConfig?.locales ?? [];

  /*
   * A configured locale is not automatically a usable homepage.
   *
   * Only published Homepage documents appear here because the
   * shared Sanity client uses the published perspective.
   */
  const localeHomeHrefs = Object.fromEntries(
    Array.from(new Set(localeConfig?.homepageLocales ?? []))
      .filter(Boolean)
      .map((homepageLocale) => [
        homepageLocale,
        homepageLocale === defaultLocale ? "/" : `/${homepageLocale}`,
      ]),
  );

  return (
    <div data-mino-theme className={styles.siteLayout}>
      {header ? (
        <SiteHeader
          header={header}
          homeHref={homeHref}
          locale={locale}
          defaultLocale={defaultLocale}
          locales={locales}
          localeHrefs={localeHrefs}
          localeHomeHrefs={localeHomeHrefs}
        />
      ) : null}

      <div className={styles.main}>{children}</div>

      {footer ? <SiteFooter footer={footer} homeHref={homeHref} /> : null}
    </div>
  );
}
