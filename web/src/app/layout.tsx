import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { draftMode, headers } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";

import "mino-ui/tokens";

import { HtmlLanguageSync } from "@/components/HtmlLanguageSync";
import { DisableDraftMode } from "@/components/Preview";
import {
  resolveLocaleCodeFromPathname,
  siteLocaleToLanguageTag,
} from "@/lib/routing/locale";
import { SanityLive } from "@/sanity/live";
import { resolveSiteByHostCached } from "@/sanity/queries/site";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Website Starter",
  description: "Starter template for websites",
};

function getRequestHost(
  requestHeaders: Awaited<ReturnType<typeof headers>>,
): string | null {
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const hostHeader = requestHeaders.get("host");

  return forwardedHost?.split(",")[0]?.trim() ?? hostHeader?.trim() ?? null;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ isEnabled: isDraftMode }, requestHeaders] = await Promise.all([
    draftMode(),
    headers(),
  ]);

  const host = getRequestHost(requestHeaders);
  const pathname = requestHeaders.get("x-proti-pathname") ?? "/";

  let htmlLang = "en";
  let languageSync: ReactNode = null;

  if (host) {
    try {
      const site = await resolveSiteByHostCached(host);

      if (site) {
        const localeCodes = site.locales
          .map((item) => item.code)
          .filter(Boolean);

        const locale = resolveLocaleCodeFromPathname({
          pathname,
          defaultLocale: site.defaultLocale,
          locales: localeCodes,
        });

        htmlLang = siteLocaleToLanguageTag(locale);

        languageSync = (
          <HtmlLanguageSync
            defaultLocale={site.defaultLocale}
            locales={localeCodes}
          />
        );
      }
    } catch {
      /*
       * Keep the root document usable if Site resolution is temporarily
       * unavailable. The catch-all route will continue to handle its own
       * CMS/error behavior, while the document falls back to English.
       */
    }
  }

  return (
    <html
      lang={htmlLang}
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        {languageSync}
        {children}
        {isDraftMode ? (
          <>
            <SanityLive includeDrafts />
            <VisualEditing />
            <DisableDraftMode />
          </>
        ) : null}
      </body>
    </html>
  );
}
