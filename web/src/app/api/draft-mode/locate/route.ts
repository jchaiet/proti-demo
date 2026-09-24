import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { buildLocalePublicPath } from "@/lib/routing/public-url";
import { sanityFetch } from "@/sanity/fetch";
import { resolvePageSegmentsById } from "@/sanity/queries/page";

interface LocatedDocument {
  _id: string;
  _type: string;
  locale?: string;
  slug?: string;
  siteId?: string;
  defaultLocale?: string;
}

interface ReferenceConsumer {
  _id: string;
  _type: "page" | "blog";
  locale?: string;
  slug?: string;
  siteId?: string;
  defaultLocale?: string;
}

function cleanId(id: string): string {
  return id.replace(/^drafts\./, "");
}

async function getDocument(
  documentId: string,
): Promise<LocatedDocument | null> {
  return sanityFetch<LocatedDocument | null>(
    `
      *[
        _id == $documentId
      ][0]{
        _id,
        _type,
        locale,
        "slug": slug.current,
        "siteId": site._ref,
        "defaultLocale": site->defaultLocale
      }
    `,
    {
      documentId: cleanId(documentId),
    },
  );
}

async function getSingletonConsumer(
  singletonId: string,
): Promise<ReferenceConsumer | null> {
  return sanityFetch<ReferenceConsumer | null>(
    `
      *[
        _type in ["page", "blog"] &&
        references($singletonId)
      ]
      | order(_type asc, title asc)
      [0]{
        _id,
        _type,
        locale,
        "slug": slug.current,
        "siteId": site._ref,
        "defaultLocale": site->defaultLocale
      }
    `,
    {
      singletonId: cleanId(singletonId),
    },
  );
}

async function getTaxonomyPath(documentId: string): Promise<{
  path: string;
  defaultLocale?: string;
} | null> {
  const document = await sanityFetch<{
    _id: string;
    slug?: string;
    parentId?: string;
    defaultLocale?: string;
  } | null>(
    `
      *[
        _type == "taxonomy" &&
        _id == $documentId
      ][0]{
        _id,
        "slug": slug.current,
        "parentId": parent._ref,
        "defaultLocale": site->defaultLocale
      }
    `,
    {
      documentId: cleanId(documentId),
    },
  );

  if (!document?.slug) {
    return null;
  }

  const segments = [document.slug];
  let parentId = document.parentId;
  const visited = new Set<string>();
  let depth = 0;

  while (parentId && depth < 50) {
    const cleanParentId = cleanId(parentId);

    if (visited.has(cleanParentId)) {
      return null;
    }

    visited.add(cleanParentId);

    const parent = await sanityFetch<{
      slug?: string;
      parentId?: string;
    } | null>(
      `
        *[
          _type == "taxonomy" &&
          _id == $documentId
        ][0]{
          "slug": slug.current,
          "parentId": parent._ref
        }
      `,
      {
        documentId: cleanParentId,
      },
    );

    if (!parent?.slug) {
      return null;
    }

    segments.unshift(parent.slug);
    parentId = parent.parentId;
    depth++;
  }

  return {
    path: segments.join("/"),
    defaultLocale: document.defaultLocale,
  };
}

async function resolvePreviewPath(
  type: string,
  documentId: string,
  requestedLocale?: string,
): Promise<string | null> {
  const document = await getDocument(documentId);

  if (!document || document._type !== type) {
    return null;
  }

  if (type === "page") {
    const segments = await resolvePageSegmentsById(document._id);

    if (!segments) {
      return null;
    }

    const locale = document.locale;

    if (!locale || !document.defaultLocale) {
      return null;
    }

    return buildLocalePublicPath({
      locale,
      defaultLocale: document.defaultLocale,
      path: segments.length ? `/${segments.join("/")}` : "/",
    });
  }

  if (
    type === "blog" &&
    document.slug &&
    document.locale &&
    document.defaultLocale
  ) {
    return buildLocalePublicPath({
      locale: document.locale,
      defaultLocale: document.defaultLocale,
      path: `/blog/${document.slug}`,
    });
  }

  if (type === "author" && document.slug && document.defaultLocale) {
    const locale = requestedLocale || document.defaultLocale;

    return buildLocalePublicPath({
      locale,
      defaultLocale: document.defaultLocale,
      path: `/authors/${document.slug}`,
    });
  }

  if (type === "taxonomy") {
    const taxonomy = await getTaxonomyPath(document._id);

    if (!taxonomy?.defaultLocale) {
      return null;
    }

    const locale = requestedLocale || taxonomy.defaultLocale;

    return buildLocalePublicPath({
      locale,
      defaultLocale: taxonomy.defaultLocale,
      path: `/blog/${taxonomy.path}`,
    });
  }

  if (type === "singleton") {
    const consumer = await getSingletonConsumer(document._id);

    if (!consumer?.defaultLocale || !consumer.locale) {
      return null;
    }

    if (consumer._type === "blog" && consumer.slug) {
      return buildLocalePublicPath({
        locale: consumer.locale,
        defaultLocale: consumer.defaultLocale,
        path: `/blog/${consumer.slug}`,
      });
    }

    const segments = await resolvePageSegmentsById(consumer._id);

    if (!segments) {
      return null;
    }

    return buildLocalePublicPath({
      locale: consumer.locale,
      defaultLocale: consumer.defaultLocale,
      path: segments.length ? `/${segments.join("/")}` : "/",
    });
  }

  if (
    ["navigationHeader", "navigationFooter", "navigationSet"].includes(type) &&
    document.locale &&
    document.defaultLocale
  ) {
    return buildLocalePublicPath({
      locale: document.locale,
      defaultLocale: document.defaultLocale,
      path: "/",
    });
  }

  return null;
}

export async function GET(request: NextRequest) {
  if (!(await draftMode()).isEnabled) {
    return new NextResponse("Draft Mode is required.", { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type")?.trim();
  const id = request.nextUrl.searchParams.get("id")?.trim();
  const locale = request.nextUrl.searchParams.get("locale")?.trim();

  if (!type || !id) {
    return new NextResponse("Missing preview document type or id.", {
      status: 400,
    });
  }

  const path = await resolvePreviewPath(type, id, locale || undefined);

  if (!path) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(new URL(path, request.url));
}
