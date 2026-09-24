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

import { resolvePageBySegments } from "./page";

beforeEach(() => {
  fetchMock.mockReset();
});

describe("resolvePageBySegments", () => {
  it("resolves the homepage within the requested Site and Locale", async () => {
    fetchMock.mockResolvedValueOnce({ _id: "home-es" }).mockResolvedValueOnce({
      _id: "home-es",
      title: "Inicio",
      locale: "us-es",
      isHomepage: true,
    });

    await expect(
      resolvePageBySegments("site-a", "us-es", []),
    ).resolves.toMatchObject({
      _id: "home-es",
      locale: "us-es",
      isHomepage: true,
    });

    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      siteId: "site-a",
      locale: "us-es",
    });
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      pageId: "home-es",
      siteId: "site-a",
      locale: "us-es",
    });
  });

  it("resolves every nested Page segment within the same Site and Locale", async () => {
    fetchMock
      .mockResolvedValueOnce({ _id: "products-es" })
      .mockResolvedValueOnce({ _id: "widget-es" })
      .mockResolvedValueOnce({
        _id: "widget-es",
        title: "Widget",
        slug: "widget",
        locale: "us-es",
      });

    await expect(
      resolvePageBySegments("site-a", "us-es", ["products", "widget"]),
    ).resolves.toMatchObject({
      _id: "widget-es",
      locale: "us-es",
    });

    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      siteId: "site-a",
      locale: "us-es",
      slug: "products",
    });
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      siteId: "site-a",
      locale: "us-es",
      slug: "widget",
      parentId: "products-es",
    });
    expect(fetchMock.mock.calls[2]?.[1]).toEqual({
      pageId: "widget-es",
      siteId: "site-a",
      locale: "us-es",
    });
  });

  it("fails safely when any nested segment does not resolve", async () => {
    fetchMock
      .mockResolvedValueOnce({ _id: "products" })
      .mockResolvedValueOnce(null);

    await expect(
      resolvePageBySegments("site-a", "us-en", ["products", "missing"]),
    ).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not fetch full Page content when the root segment is missing", async () => {
    fetchMock.mockResolvedValueOnce(null);

    await expect(
      resolvePageBySegments("site-a", "us-en", ["missing"]),
    ).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
