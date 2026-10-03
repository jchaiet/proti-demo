import type { ReactNode } from "react";

import type { CmsNavigationOverride } from "@/cms/types";

import {
  mapNavigationFooter,
  mapNavigationHeader,
} from "@/cms/mappers/navigation";

import { resolveNavigation } from "@/cms/resolvers/navigation";

import { resolveSiteLocales } from "@/sanity/queries/site";

import { ModalRegistry } from "@/components/ModalRegistry";

import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

import styles from "./styles.module.css";

export interface SiteLayoutProps {
  siteId: string;
  locale: string;

  navigationOverride?: CmsNavigationOverride;

  homeHref?: string;

  /**
   * Exact translated CMS-document URLs keyed by Site locale.
   *
   * Undefined means the caller does not have an exact translation map.
   * Header utilities can then fall back to published locale homepages or,
   * for legacy callers without availability data, preserve the route path.
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

      <ModalRegistry
        siteId={siteId}
        locale={locale}
        visualEditing={visualEditing}
      />
    </div>
  );
}
