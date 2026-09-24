import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({
  fetchMock:
    vi.fn<
      (query: string, params?: Record<string, unknown>) => Promise<unknown>
    >(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: fetchMock,
  },
}));

import { getPageUrl } from "./page-url";

beforeEach(() => {
  fetchMock.mockReset();
});

describe("getPageUrl", () => {
  it("builds a nested default-locale Page URL", async () => {
    fetchMock
      .mockResolvedValueOnce({
        _id: "page-child",
        slug: "widget",
        locale: "us-en",
        parent: { _ref: "page-parent" },
        site: {
          _id: "site-a",
          defaultLocale: "us-en",
        },
      })
      .mockResolvedValueOnce({
        _id: "page-parent",
        slug: "products",
        locale: "us-en",
        site: { _ref: "site-a" },
      });

    await expect(
      getPageUrl("drafts.page-child", {
        expectedSiteId: "drafts.site-a",
        expectedLocale: "us-en",
      }),
    ).resolves.toBe("/products/widget");
  });

  it("prefixes a non-default locale", async () => {
    fetchMock.mockResolvedValueOnce({
      _id: "page-1",
      slug: "producto",
      locale: "us-es",
      site: {
        _id: "site-a",
        defaultLocale: "us-en",
      },
    });

    await expect(
      getPageUrl("page-1", {
        expectedSiteId: "site-a",
        expectedLocale: "us-es",
      }),
    ).resolves.toBe("/us-es/producto");
  });

  it("returns the correct homepage URL", async () => {
    fetchMock.mockResolvedValueOnce({
      _id: "home-en",
      locale: "us-en",
      isHomepage: true,
      site: {
        _id: "site-a",
        defaultLocale: "us-en",
      },
    });

    await expect(getPageUrl("home-en")).resolves.toBe("/");

    fetchMock.mockResolvedValueOnce({
      _id: "home-es",
      locale: "us-es",
      isHomepage: true,
      site: {
        _id: "site-a",
        defaultLocale: "us-en",
      },
    });

    await expect(getPageUrl("home-es")).resolves.toBe("/us-es");
  });

  it("rejects a Page from another Site", async () => {
    fetchMock.mockResolvedValueOnce({
      _id: "page-1",
      slug: "widget",
      locale: "us-en",
      site: {
        _id: "site-b",
        defaultLocale: "us-en",
      },
    });

    await expect(
      getPageUrl("page-1", {
        expectedSiteId: "site-a",
        expectedLocale: "us-en",
      }),
    ).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a Page from another Locale", async () => {
    fetchMock.mockResolvedValueOnce({
      _id: "page-1",
      slug: "widget",
      locale: "us-es",
      site: {
        _id: "site-a",
        defaultLocale: "us-en",
      },
    });

    await expect(
      getPageUrl("page-1", {
        expectedSiteId: "site-a",
        expectedLocale: "us-en",
      }),
    ).resolves.toBeNull();
  });

  it("rejects a parent from another Site", async () => {
    fetchMock
      .mockResolvedValueOnce({
        _id: "page-child",
        slug: "widget",
        locale: "us-en",
        parent: { _ref: "page-parent" },
        site: {
          _id: "site-a",
          defaultLocale: "us-en",
        },
      })
      .mockResolvedValueOnce({
        _id: "page-parent",
        slug: "products",
        locale: "us-en",
        site: { _ref: "site-b" },
      });

    await expect(
      getPageUrl("page-child", {
        expectedSiteId: "site-a",
        expectedLocale: "us-en",
      }),
    ).resolves.toBeNull();
  });

  it("rejects a parent from another Locale", async () => {
    fetchMock
      .mockResolvedValueOnce({
        _id: "page-child",
        slug: "widget",
        locale: "us-en",
        parent: { _ref: "page-parent" },
        site: {
          _id: "site-a",
          defaultLocale: "us-en",
        },
      })
      .mockResolvedValueOnce({
        _id: "page-parent",
        slug: "products",
        locale: "us-es",
        site: { _ref: "site-a" },
      });

    await expect(
      getPageUrl("page-child", {
        expectedSiteId: "site-a",
        expectedLocale: "us-en",
      }),
    ).resolves.toBeNull();
  });

  it("fails safely when a referenced parent is missing", async () => {
    fetchMock
      .mockResolvedValueOnce({
        _id: "page-child",
        slug: "widget",
        locale: "us-en",
        parent: { _ref: "missing-parent" },
        site: {
          _id: "site-a",
          defaultLocale: "us-en",
        },
      })
      .mockResolvedValueOnce(null);

    await expect(getPageUrl("page-child")).resolves.toBeNull();
  });

  it("fails safely on a circular Page hierarchy", async () => {
    fetchMock
      .mockResolvedValueOnce({
        _id: "page-child",
        slug: "widget",
        locale: "us-en",
        parent: { _ref: "page-parent" },
        site: {
          _id: "site-a",
          defaultLocale: "us-en",
        },
      })
      .mockResolvedValueOnce({
        _id: "page-parent",
        slug: "products",
        locale: "us-en",
        site: { _ref: "site-a" },
        parent: { _ref: "page-child" },
      });

    await expect(getPageUrl("page-child")).resolves.toBeNull();
  });
});
