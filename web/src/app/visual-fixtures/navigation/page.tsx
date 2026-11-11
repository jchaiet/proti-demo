import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  mapNavigationFooter,
  mapNavigationHeader,
} from "@/cms/mappers/navigation";
import { SiteFooter } from "@/components/SiteLayout/SiteFooter";
import { SiteHeader } from "@/components/SiteLayout/SiteHeader";
import layoutStyles from "@/components/SiteLayout/styles.module.css";
import { visualFixturesEnabled } from "@/visual-fixtures/enabled";
import {
  navigationVisualFooter,
  navigationVisualHeader,
  navigationVisualLocaleHrefs,
  navigationVisualLocales,
} from "@/visual-fixtures/navigation";

import styles from "./styles.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Navigation visual fixture | Proti",
  robots: { index: false, follow: false },
};

/**
 * Mirrors the real SiteLayout structure without resolveNavigation() or
 * resolveSiteLocales(), both of which intentionally fetch Sanity content.
 */
export default async function NavigationVisualFixturePage() {
  if (!visualFixturesEnabled()) notFound();

  const [header, footer] = await Promise.all([
    mapNavigationHeader(navigationVisualHeader),
    mapNavigationFooter(navigationVisualFooter),
  ]);

  if (!header || !footer) {
    throw new Error("The navigation visual fixture could not be mapped");
  }

  const homeHref = "/visual-fixtures/navigation";

  return (
    <div
      data-mino-theme
      data-visual-fixture="navigation"
      className={layoutStyles.siteLayout}
    >
      <SiteHeader
        header={header}
        homeHref={homeHref}
        locale="en-us"
        defaultLocale="en-us"
        locales={navigationVisualLocales}
        localeHrefs={navigationVisualLocaleHrefs}
      />

      <div className={layoutStyles.main}>
        <main id="fixture-home" className={styles.content}>
          <p className={styles.eyebrow}>NAVIGATION / VISUAL REGRESSION</p>
          <h1>Navigation and footer layouts</h1>
          <p className={styles.intro}>
            Version-controlled content for checking responsive navigation,
            dropdowns, megamenus, language controls, and footer columns.
          </p>
          <div className={styles.cards}>
            <section id="fixture-components" className={styles.card}>
              <h2>Mino UI</h2>
              <p>Shared components with consistent styles and interaction.</p>
            </section>
            <section id="fixture-starter" className={styles.card}>
              <h2>Proti starter</h2>
              <p>A reusable frontend and a structured content system.</p>
            </section>
            <section id="fixture-documentation" className={styles.card}>
              <h2>Documentation</h2>
              <p>Implementation guidance and testable patterns.</p>
            </section>
          </div>
          <div className={styles.targets} aria-label="Fixture anchor targets">
            <span id="fixture-guides">Guides</span>
            <span id="fixture-contact">Contact</span>
            <span id="fixture-privacy">Privacy</span>
            <span id="fixture-accessibility">Accessibility</span>
          </div>
        </main>
      </div>

      <SiteFooter footer={footer} homeHref={homeHref} />
    </div>
  );
}
