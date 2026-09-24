"use client";

import {
  FaBluesky,
  FaFacebookF,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedinIn,
  FaTwitter,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

import { ContentBlock } from "mino-ui/blocks/ContentBlock";
import type { ContentBlockProps } from "mino-ui/blocks/ContentBlock";

import { DocumentListBlock } from "mino-ui/blocks/DocumentListBlock";
import type { DocumentItem } from "mino-ui/blocks/DocumentListBlock";

import { RichTextBlock } from "mino-ui/blocks/RichTextBlock";

import type {
  CmsAuthor,
  CmsAuthorArticle,
  CmsAuthorPage,
} from "@/cms/types/author";

import styles from "./styles.module.css";

export interface AuthorTemplateProps {
  page: CmsAuthorPage;

  /**
   * Empty for the default locale.
   *
   * Example:
   * /us-es
   */
  localePrefix?: string;
}

function normalizePrefix(prefix?: string): string {
  if (!prefix) {
    return "";
  }

  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`;

  return normalized.replace(/\/+$/, "");
}

function getBlogHref(slug: string, localePrefix?: string): string {
  const prefix = normalizePrefix(localePrefix);

  return `${prefix}/blog/${slug}`;
}

function getIntlLocale(locale: string): string {
  const [region, language] = locale.split("-");

  if (!region || !language) {
    return locale;
  }

  return `${language.toLowerCase()}-${region.toUpperCase()}`;
}

function formatPublishedDate(
  date: string | undefined,
  locale: string,
): string | undefined {
  if (!date) {
    return undefined;
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  try {
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(parsed);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(parsed);
  }
}

type SocialNetwork =
  | "bluesky"
  | "facebook"
  | "github"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "x"
  | "youtube"
  | "website";

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function getSocialNetwork(url: string): SocialNetwork {
  const hostname = getHostname(url);

  if (hostname === "bsky.app" || hostname.endsWith(".bsky.app")) {
    return "bluesky";
  }

  if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) {
    return "linkedin";
  }

  if (hostname === "github.com" || hostname.endsWith(".github.com")) {
    return "github";
  }

  if (hostname === "x.com" || hostname.endsWith(".x.com")) {
    return "x";
  }

  if (hostname === "twitter.com" || hostname.endsWith(".twitter.com")) {
    return "twitter";
  }

  if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) {
    return "instagram";
  }

  if (hostname === "facebook.com" || hostname.endsWith(".facebook.com")) {
    return "facebook";
  }

  if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
    return "youtube";
  }

  return "website";
}

function getSocialLabel(url: string): string {
  const network = getSocialNetwork(url);

  switch (network) {
    case "bluesky":
      return "Bluesky";

    case "facebook":
      return "Facebook";

    case "github":
      return "GitHub";

    case "instagram":
      return "Instagram";

    case "linkedin":
      return "LinkedIn";

    case "twitter":
      return "Twitter";

    case "x":
      return "X";

    case "youtube":
      return "YouTube";

    default: {
      const hostname = getHostname(url);

      return hostname || "Website";
    }
  }
}

function getSocialIcon(url: string) {
  const iconProps = {
    size: 18,
    "aria-hidden": true,
    focusable: false,
  } as const;

  switch (getSocialNetwork(url)) {
    case "bluesky":
      return <FaBluesky {...iconProps} />;

    case "facebook":
      return <FaFacebookF {...iconProps} />;

    case "github":
      return <FaGithub {...iconProps} />;

    case "instagram":
      return <FaInstagram {...iconProps} />;

    case "linkedin":
      return <FaLinkedinIn {...iconProps} />;

    case "twitter":
      return <FaTwitter {...iconProps} />;

    case "x":
      return <FaXTwitter {...iconProps} />;

    case "youtube":
      return <FaYoutube {...iconProps} />;

    default:
      return <FaGlobe {...iconProps} />;
  }
}

function buildSocialCtas(
  author: CmsAuthor,
): NonNullable<ContentBlockProps["ctas"]> {
  const urls = Array.from(
    new Set(
      [author.profileUrl, ...(author.sameAs ?? [])].filter(
        (url): url is string => Boolean(url),
      ),
    ),
  );

  return urls.map((url) => ({
    as: "a" as const,
    href: url,
    label: getSocialLabel(url),
    variant: "link" as const,
    size: "sm" as const,
    icon: getSocialIcon(url),
    iconAlignment: "left" as const,
    target: "_blank",
    rel: "noopener noreferrer",
  }));
}

function mapArticle(
  article: CmsAuthorArticle,
  author: CmsAuthor,
  locale: string,
  localePrefix?: string,
): DocumentItem {
  return {
    id: article._id,

    contentType: "blog",
    cardType: "article",

    title: article.title,
    summary: article.summary,

    url: getBlogHref(article.slug, localePrefix),

    date: formatPublishedDate(article.publishedAt, locale),

    thumbnail: article.imageUrl,

    tags: article.taxonomy?.map((term) => term.title).filter(Boolean),

    author: {
      name: author.name,
      role: author.jobTitle,
      avatarUrl: author.imageUrl,
    },
  };
}

export function AuthorTemplate({ page, localePrefix }: AuthorTemplateProps) {
  const { author, articles } = page;

  const socialCtas = buildSocialCtas(author);

  const documents = articles.map((article) =>
    mapArticle(article, author, page.locale, localePrefix),
  );

  const hasBio = Boolean(author.bioRichText || author.bio);

  const hasExpertiseDetails = Boolean(
    author.expertise?.length ||
    author.credentials?.length ||
    author.affiliation?.name,
  );

  return (
    <article className={styles.authorPage}>
      <ContentBlock
        className={styles.profileHeader}
        layout="split"
        mediaPosition="left"
        vAlignment="center"
        alignment="left"
        title={author.name}
        headingProps={{
          level: 1,
          size: "2xl",
        }}
        description={author.jobTitle}
        ctas={socialCtas}
        ctaGroupProps={{
          stackOnMobile: false,
        }}
        imageSrc={author.imageUrl}
        imageAlt={author.imageAlt ?? ""}
        imageShape="circle"
        imageSize="sm"
      />

      <div className={styles.dividerWrap} aria-hidden="true">
        <hr className={styles.divider} />
      </div>

      {hasBio ? (
        <RichTextBlock
          className={styles.bio}
          content={author.bioRichText ?? author.bio ?? ""}
          alignment="left"
          maxWidth="full"
        />
      ) : null}

      {hasExpertiseDetails ? (
        <section
          className={styles.expertise}
          aria-labelledby="author-expertise-heading"
        >
          <h2 id="author-expertise-heading">Expertise &amp; Credentials</h2>

          {author.expertise?.length ? (
            <div>
              <h3>Areas of expertise</h3>
              <ul className={styles.expertiseList}>
                {author.expertise.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {author.credentials?.length ? (
            <div>
              <h3>Credentials</h3>
              <ul className={styles.credentialList}>
                {author.credentials.map((credential, index) => (
                  <li key={`${credential.name}-${index}`}>
                    {credential.url ? (
                      <a
                        href={credential.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {credential.name}
                      </a>
                    ) : (
                      credential.name
                    )}

                    {[
                      credential.category,
                      credential.recognizedBy,
                      credential.identifier,
                    ].filter(Boolean).length ? (
                      <span className={styles.credentialMeta}>
                        {[
                          credential.category,
                          credential.recognizedBy,
                          credential.identifier,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {author.affiliation?.name ? (
            <div>
              <h3>Affiliation</h3>
              <p>
                {author.affiliation.url ? (
                  <a
                    href={author.affiliation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {author.affiliation.name}
                  </a>
                ) : (
                  author.affiliation.name
                )}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {hasBio || hasExpertiseDetails ? (
        <div className={styles.dividerWrap} aria-hidden="true">
          <hr className={styles.divider} />
        </div>
      ) : null}

      <DocumentListBlock
        className={styles.articles}
        title={`Articles written by ${author.name}`}
        headingProps={{
          level: 2,
          size: "2xl",
        }}
        documents={documents}
        defaultCardType="article"
        alignment="left"
        gridCols={3}
        totalResults={documents.length}
        emptyStateText={`No published articles by ${author.name} yet.`}
      />
    </article>
  );
}
