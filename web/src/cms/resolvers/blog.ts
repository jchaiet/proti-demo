import type { PortableTextBlock } from "@portabletext/types";

import type { CmsAuthor, CmsBlog, CmsImage, CmsSeo } from "@/cms/types";

import { portableTextToPlainText } from "@/cms/resolvers/portable-text-markdown";

import { resolveSanityImagePreset } from "@/cms/resolvers/image";

import { sanityFetch } from "@/sanity/fetch";

import { BLOG_BY_SLUG_QUERY } from "@/sanity/queries/blog";

export interface GetBlogBySlugOptions {
  siteId: string;

  locale: string;

  slug: string;

  visualEditing?: boolean;
}

type BlogAuthorRecord = Omit<
  CmsAuthor,
  | "bio"
  | "bioPortableText"
  | "bioRichText"
  | "imageUrl"
  | "socialImageUrl"
  | "imageAlt"
> & {
  bioPortableText?: PortableTextBlock[];

  bioLegacy?: string;

  image?: CmsImage;
};

type BlogSeoRecord = Omit<CmsSeo, "socialImageUrl" | "socialImageAlt"> & {
  socialImage?: CmsImage;
};

type BlogQueryRecord = Omit<
  CmsBlog,
  "imageUrl" | "socialImageUrl" | "imageAlt" | "author" | "reviewer" | "seo"
> & {
  mainImage?: CmsImage;

  author?: BlogAuthorRecord;

  reviewer?: BlogAuthorRecord;

  seo?: BlogSeoRecord;
};

function mapAuthor(
  record: BlogAuthorRecord | undefined,
): CmsAuthor | undefined {
  if (!record) {
    return undefined;
  }

  const { bioPortableText, bioLegacy, image, ...author } = record;

  return {
    ...author,

    bio: portableTextToPlainText(bioPortableText) || bioLegacy || undefined,

    bioPortableText: bioPortableText?.length ? bioPortableText : undefined,

    imageUrl: resolveSanityImagePreset(image, "avatar"),

    socialImageUrl: resolveSanityImagePreset(image, "social"),

    imageAlt: image?.alt ?? "",
  };
}

export async function getBlogBySlug({
  siteId,
  locale,
  slug,
  visualEditing = false,
}: GetBlogBySlugOptions): Promise<CmsBlog | null> {
  if (!siteId || !locale || !slug) {
    return null;
  }

  const record = await sanityFetch<BlogQueryRecord | null>(
    BLOG_BY_SLUG_QUERY,
    {
      siteId,
      locale,
      slug,
    },
    { visualEditing },
  );

  if (!record) {
    return null;
  }

  const { mainImage, author, reviewer, seo, ...blog } = record;

  const mappedSeo = seo
    ? (() => {
        const { socialImage, ...seoFields } = seo;

        return {
          ...seoFields,

          socialImageUrl: resolveSanityImagePreset(socialImage, "social"),

          socialImageAlt: socialImage?.alt ?? "",
        } satisfies CmsSeo;
      })()
    : undefined;

  return {
    ...blog,

    imageUrl: resolveSanityImagePreset(mainImage, "hero"),

    socialImageUrl: resolveSanityImagePreset(mainImage, "social"),

    imageAlt: mainImage?.alt ?? "",

    author: mapAuthor(author),

    reviewer: mapAuthor(reviewer),

    seo: mappedSeo,
  };
}
