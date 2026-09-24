"use client";

import { useEffect, useRef, useState } from "react";

import { usePathname, useSearchParams } from "next/navigation";

import styles from "./styles.module.css";

export interface HeaderLocale {
  code: string;
  label?: string;
}

export interface HeaderUtilitiesProps {
  locale: string;
  defaultLocale: string;
  locales: HeaderLocale[];

  /**
   * Exact translated content URLs keyed by Site locale.
   *
   * When this prop is present, missing target translations
   * fall back to that locale's homepage instead of guessing
   * that the current slug path exists in the target locale.
   */
  localeHrefs?: Record<string, string>;

  /**
   * Published Homepage URLs keyed by Site locale.
   *
   * If an exact translated equivalent does not exist, the language
   * switcher may use this as the fallback destination. If neither
   * exists, that target locale is hidden.
   */
  localeHomeHrefs?: Record<string, string>;
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function LanguageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 0 20" />
      <path d="M12 2a15.3 15.3 0 0 0 0 20" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function getLanguageCode(locale: string): string {
  const parts = locale.split("-").filter(Boolean);

  const language = parts.at(-1) ?? locale;

  return language.toUpperCase();
}

function stripCurrentLocalePrefix(
  pathname: string,
  locale: string,
  defaultLocale: string,
): string {
  if (locale === defaultLocale) {
    return pathname || "/";
  }

  const prefix = `/${locale}`;

  if (pathname === prefix) {
    return "/";
  }

  if (pathname.startsWith(`${prefix}/`)) {
    const stripped = pathname.slice(prefix.length);

    return stripped || "/";
  }

  return pathname || "/";
}

function buildLocalePath({
  pathname,
  currentLocale,
  targetLocale,
  defaultLocale,
}: {
  pathname: string;
  currentLocale: string;
  targetLocale: string;
  defaultLocale: string;
}): string {
  const basePath = stripCurrentLocalePrefix(
    pathname,
    currentLocale,
    defaultLocale,
  );

  if (targetLocale === defaultLocale) {
    return basePath;
  }

  if (basePath === "/") {
    return `/${targetLocale}`;
  }

  return `/${targetLocale}${basePath}`;
}

function appendQueryString(pathname: string, queryString: string): string {
  if (!queryString) {
    return pathname;
  }

  return `${pathname}?${queryString}`;
}

export function HeaderUtilities({
  locale,
  defaultLocale,
  locales,
  localeHrefs,
  localeHomeHrefs,
}: HeaderUtilitiesProps) {
  const pathname = usePathname();

  const searchParams = useSearchParams();

  const queryString = searchParams.toString();

  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  const languageControlRef = useRef<HTMLDivElement>(null);

  const languageTriggerRef = useRef<HTMLButtonElement>(null);

  const configuredLocales = locales.filter((item) => Boolean(item.code));

  const searchHref = locale === defaultLocale ? "/search" : `/${locale}/search`;

  const hasExactLocaleHref = (targetLocale: string): boolean =>
    Boolean(localeHrefs?.[targetLocale]);

  const hasLocaleHomepage = (targetLocale: string): boolean =>
    Boolean(localeHomeHrefs?.[targetLocale]);

  /*
   * Language-switch availability:
   *
   * 1. Exact equivalent exists -> show it.
   * 2. Exact equivalent is missing but a published target-locale
   *    Homepage exists -> show it and fall back to that Homepage.
   * 3. Neither exists -> hide the target locale.
   *
   * Always retain the current locale internally so the trigger can
   * display the active language even when there are no alternatives.
   */
  const validLocales = configuredLocales.filter(
    (item) =>
      item.code === locale ||
      hasExactLocaleHref(item.code) ||
      hasLocaleHomepage(item.code),
  );

  const getLocaleHref = (targetLocale: string): string | null => {
    const exactHref = localeHrefs?.[targetLocale];

    if (exactHref) {
      return appendQueryString(exactHref, queryString);
    }

    const homepageHref = localeHomeHrefs?.[targetLocale];

    if (homepageHref) {
      return appendQueryString(homepageHref, queryString);
    }

    /*
     * Backwards-compatible fallback for callers that do not provide
     * homepage availability. SiteLayout now always provides it.
     */
    if (localeHomeHrefs === undefined && localeHrefs === undefined) {
      return appendQueryString(
        buildLocalePath({
          pathname,
          currentLocale: locale,
          targetLocale,
          defaultLocale,
        }),
        queryString,
      );
    }

    return null;
  };

  const availableLocales = validLocales
    .filter((item) => item.code !== locale)
    .map((item) => ({
      locale: item,
      href: getLocaleHref(item.code),
    }))
    .filter(
      (
        item,
      ): item is {
        locale: HeaderLocale;
        href: string;
      } => Boolean(item.href),
    );

  useEffect(() => {
    if (!isLanguageMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        !languageControlRef.current?.contains(target)
      ) {
        setIsLanguageMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsLanguageMenuOpen(false);
      languageTriggerRef.current?.focus();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLanguageMenuOpen]);

  const renderLanguageControl = () => {
    /*
     * No valid alternate destination means there is nothing to switch to,
     * so the entire language control stays hidden.
     */
    if (availableLocales.length === 0) {
      return null;
    }

    const currentLocaleLabel = getLanguageCode(locale);

    return (
      <div className={styles.languageControl} ref={languageControlRef}>
        <button
          ref={languageTriggerRef}
          type="button"
          className={`${styles.utilityButton} ${styles.languageTrigger}`}
          aria-label={`Current language: ${currentLocaleLabel}. Choose language`}
          aria-haspopup="menu"
          aria-expanded={isLanguageMenuOpen}
          onClick={() => setIsLanguageMenuOpen((open) => !open)}
        >
          <span className={styles.languageIcon}>
            <LanguageIcon />
          </span>

          <span className={styles.languageCurrent}>{currentLocaleLabel}</span>

          <span
            className={`${styles.languageChevron} ${
              isLanguageMenuOpen ? styles.languageChevronOpen : ""
            }`}
          >
            <ChevronDownIcon />
          </span>
        </button>

        {isLanguageMenuOpen ? (
          <div
            className={styles.languageMenu}
            role="menu"
            aria-label="Available languages"
          >
            {availableLocales.map(({ locale: targetLocale, href }) => (
              <a
                key={targetLocale.code}
                href={href}
                className={styles.languageMenuItem}
                role="menuitem"
                hrefLang={targetLocale.code}
                onClick={() => setIsLanguageMenuOpen(false)}
              >
                {getLanguageCode(targetLocale.code)}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={styles.headerUtilities}>
      <a
        href={searchHref}
        className={`${styles.utilityButton} ${styles.searchButton}`}
        aria-label="Search"
      >
        <span className={styles.utilityIcon}>
          <SearchIcon />
        </span>
      </a>
      {renderLanguageControl()}
    </div>
  );
}
