import { describe, expect, it } from "vitest";

import {
  buildAllSitePublicPaths,
  buildAuthorPaths,
  buildBlogPath,
  buildPagePaths,
  buildTaxonomyPaths,
  type SitePublicRouteIndex,
} from "./routes";

const index: SitePublicRouteIndex = {
  site: {
    _id: "site-a",
    defaultLocale: "us-en",
    locales: [{ code: "us-en" }, { code: "us-es" }],
  },
  pages: [
    {
      _id: "home-en",
      locale: "us-en",
      isHomepage: true,
    },
    {
      _id: "products-en",
      locale: "us-en",
      slug: "products",
    },
    {
      _id: "widget-en",
      locale: "us-en",
      slug: "widget",
      parentId: "products-en",
    },
    {
      _id: "search-page",
      locale: "us-en",
      slug: "search",
    },
    {
      _id: "home-es",
      locale: "us-es",
      isHomepage: true,
    },
  ],
  blogs: [
    {
      _id: "blog-en",
      locale: "us-en",
      slug: "nutrition",
    },
    {
      _id: "blog-es",
      locale: "us-es",
      slug: "nutricion",
    },
  ],
  authors: [{ _id: "author-a", slug: "jane-doe" }],
  taxonomy: [
    { _id: "taxonomy-root", slug: "topics" },
    {
      _id: "taxonomy-child",
      slug: "nutrition",
      parentId: "taxonomy-root",
    },
  ],
};

describe("revalidation route builders", () => {
  it("builds locale-aware Page paths and omits reserved Page routes", () => {
    expect(buildPagePaths(index)).toEqual([
      "/",
      "/products",
      "/products/widget",
      "/us-es",
    ]);
  });

  it("can reconstruct an old Page hierarchy from a webhook snapshot", () => {
    expect(
      buildPagePaths(index, {
        locale: "us-en",
        snapshot: {
          _id: "products-en",
          _type: "page",
          siteId: "site-a",
          locale: "us-en",
          slug: "catalog",
          isHomepage: false,
        },
      }),
    ).toEqual(["/", "/catalog", "/catalog/widget"]);
  });

  it("builds Blog and Author paths with the default locale unprefixed", () => {
    expect(
      buildBlogPath(
        {
          locale: "us-es",
          slug: "nutrition",
        },
        "us-en",
      ),
    ).toBe("/us-es/blog/nutrition");

    expect(
      buildAuthorPaths("jane-doe", "us-en", [
        { code: "us-en" },
        { code: "us-es" },
      ]),
    ).toEqual(["/authors/jane-doe", "/us-es/authors/jane-doe"]);
  });

  it("only exposes taxonomy paths with at least root + child segments", () => {
    expect(buildTaxonomyPaths(index)).toEqual([
      "/blog/topics/nutrition",
      "/us-es/blog/topics/nutrition",
    ]);
  });

  it("builds the public route set needed by a Site/default Navigation invalidation", () => {
    expect(buildAllSitePublicPaths(index)).toEqual([
      "/",
      "/authors/jane-doe",
      "/blog/nutrition",
      "/blog/topics/nutrition",
      "/products",
      "/products/widget",
      "/search",
      "/us-es",
      "/us-es/authors/jane-doe",
      "/us-es/blog/nutricion",
      "/us-es/blog/topics/nutrition",
      "/us-es/search",
    ]);
  });
});
