import { describe, expect, it } from "vitest";

import { buildBreadcrumbItems } from "./structured-data-breadcrumbs";

describe("buildBreadcrumbItems", () => {
  it("returns only Home for the root route", () => {
    expect(
      buildBreadcrumbItems({
        origin: "https://example.com",
        localePrefix: "",
        segments: [],
      }),
    ).toEqual([
      {
        name: "Home",
        url: "https://example.com/",
      },
    ]);
  });

  it("builds nested default-locale breadcrumbs from URL segments", () => {
    expect(
      buildBreadcrumbItems({
        origin: "https://example.com",
        localePrefix: "",
        segments: ["blog", "topics", "heart-health"],
      }),
    ).toEqual([
      {
        name: "Home",
        url: "https://example.com/",
      },
      {
        name: "Blog",
        url: "https://example.com/blog",
      },
      {
        name: "Topics",
        url: "https://example.com/blog/topics",
      },
      {
        name: "Heart Health",
        url: "https://example.com/blog/topics/heart-health",
      },
    ]);
  });

  it("preserves the locale prefix and uses the authored leaf title", () => {
    expect(
      buildBreadcrumbItems({
        origin: "https://example.com",
        localePrefix: "/us-es",
        segments: ["blog", "topics", "nutricion"],
        leafTitle: "Nutrición",
      }),
    ).toEqual([
      {
        name: "Home",
        url: "https://example.com/us-es",
      },
      {
        name: "Blog",
        url: "https://example.com/us-es/blog",
      },
      {
        name: "Topics",
        url: "https://example.com/us-es/blog/topics",
      },
      {
        name: "Nutrición",
        url: "https://example.com/us-es/blog/topics/nutricion",
      },
    ]);
  });

  it("uses the canonical leaf URL when provided", () => {
    expect(
      buildBreadcrumbItems({
        origin: "https://example.com",
        localePrefix: "",
        segments: ["products", "widget"],
        leafTitle: "Widget",
        leafUrl: "https://canonical.example.com/widget",
      }),
    ).toEqual([
      {
        name: "Home",
        url: "https://example.com/",
      },
      {
        name: "Products",
        url: "https://example.com/products",
      },
      {
        name: "Widget",
        url: "https://canonical.example.com/widget",
      },
    ]);
  });
});
