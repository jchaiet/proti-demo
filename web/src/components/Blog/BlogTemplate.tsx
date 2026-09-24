import type { CmsBlog, CmsCitationSource } from "@/cms/types";

import { BlockRenderer } from "@/components/BlockRenderer";
import { BlogHero } from "./BlogHero";

import styles from "./styles.module.css";

export interface BlogTemplateProps {
  blog: CmsBlog;

  /*
   * Kept in the public BlogTemplate API because the current
   * catch-all route already supplies it. BlogTemplate does not
   * need it directly for the byline.
   */
  localePrefix?: string;
  visualEditing?: boolean;
}

function normalizePrefix(prefix?: string): string {
  if (!prefix) {
    return "";
  }

  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`;

  return normalized.replace(/\/+$/, "");
}

function getAuthorSlug(author: CmsBlog["author"]): string | undefined {
  if (!author || typeof author !== "object") {
    return undefined;
  }

  const slug = (
    author as {
      slug?: unknown;
    }
  ).slug;

  return typeof slug === "string" && slug ? slug : undefined;
}

function getAuthorHref(
  author: CmsBlog["author"],
  localePrefix?: string,
): string | undefined {
  const slug = getAuthorSlug(author);

  if (!slug) {
    return undefined;
  }

  const prefix = normalizePrefix(localePrefix);

  return `${prefix}/authors/${slug}`;
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

function CitationSource({
  source,
  locale,
}: {
  source: CmsCitationSource;
  locale: string;
}) {
  const publicationDate = formatPublishedDate(source.publicationDate, locale);

  const meta = [source.publisher, publicationDate].filter(Boolean).join(" • ");

  return (
    <li>
      {source.url ? (
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          {source.title}
        </a>
      ) : (
        <span>{source.title}</span>
      )}

      {meta ? <span className={styles.sourceMeta}>{meta}</span> : null}
    </li>
  );
}

export async function BlogTemplate({
  blog,
  localePrefix,
  visualEditing = false,
}: BlogTemplateProps) {
  const publishedDate = formatPublishedDate(blog.publishedAt, blog.locale);

  const lastModifiedDate = formatPublishedDate(
    blog.lastModifiedAt,
    blog.locale,
  );

  const reviewedDate = formatPublishedDate(blog.reviewedAt, blog.locale);

  const reviewerHref = getAuthorHref(blog.reviewer, localePrefix);

  const hasEditorialDetails = Boolean(
    lastModifiedDate || blog.reviewer?.name || reviewedDate,
  );

  return (
    <article>
      <BlogHero
        title={blog.title}
        summary={blog.summary}
        authorName={blog.author?.name}
        authorHref={getAuthorHref(blog.author, localePrefix)}
        taxonomy={blog.taxonomy}
        localePrefix={localePrefix}
        publishedDate={publishedDate}
        imageUrl={blog.imageUrl}
        imageAlt={blog.imageAlt}
      />

      {hasEditorialDetails ? (
        <aside
          className={styles.editorialMeta}
          aria-label="Article editorial information"
        >
          {lastModifiedDate && blog.lastModifiedAt ? (
            <p>
              <strong>Updated:</strong>{" "}
              <time dateTime={blog.lastModifiedAt}>{lastModifiedDate}</time>
            </p>
          ) : null}

          {blog.reviewer?.name ? (
            <p>
              <strong>Reviewed by:</strong>{" "}
              {reviewerHref ? (
                <a href={reviewerHref}>{blog.reviewer.name}</a>
              ) : (
                blog.reviewer.name
              )}
              {blog.reviewer.jobTitle ? `, ${blog.reviewer.jobTitle}` : ""}
              {reviewedDate && blog.reviewedAt ? (
                <>
                  {" "}
                  on <time dateTime={blog.reviewedAt}>{reviewedDate}</time>
                </>
              ) : null}
            </p>
          ) : null}
        </aside>
      ) : null}

      <BlockRenderer
        blocks={blog.sections ?? []}
        context={{
          siteId: blog.siteId,
          locale: blog.locale,
          localePrefix,
          visualEditing,
        }}
      />

      {blog.sources?.length ? (
        <section
          className={styles.sources}
          aria-labelledby="article-sources-heading"
        >
          <h2 id="article-sources-heading">Sources</h2>

          <ol>
            {blog.sources.map((source, index) => (
              <CitationSource
                key={`${source.url ?? source.title}-${index}`}
                source={source}
                locale={blog.locale}
              />
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
