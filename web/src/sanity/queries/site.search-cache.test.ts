import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  cachedEntries,
  cacheOptionsMock,
  draftModeMock,
  publishedFetchMock,
  sanityFetchMock,
} = vi.hoisted(() => ({
  cachedEntries: new Map<string, unknown>(),
  cacheOptionsMock: vi.fn(),
  draftModeMock: vi.fn(),
  publishedFetchMock: vi.fn(),
  sanityFetchMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  // Stand-in for Next's cross-request Data Cache: cache by function arguments.
  unstable_cache: vi.fn(
    <TArgs extends unknown[], TResult>(
      fetcher: (...args: TArgs) => Promise<TResult>,
      keyParts: string[],
      options: unknown,
    ) => {
      cacheOptionsMock(options);
      return async (...args: TArgs): Promise<TResult> => {
        const key = JSON.stringify([keyParts, args]);
        if (cachedEntries.has(key)) {
          return cachedEntries.get(key) as TResult;
        }
        const result = await fetcher(...args);
        cachedEntries.set(key, result);
        return result;
      };
    },
  ),
}));

vi.mock("next/headers", () => ({ draftMode: draftModeMock }));
vi.mock("@/sanity/client", () => ({
  sanityClient: { fetch: publishedFetchMock },
}));
vi.mock("@/sanity/fetch", () => ({ sanityFetch: sanityFetchMock }));

import { PUBLIC_SEARCH_SITE_LOOKUP_TAG } from "@/sanity/cache-tags";
import { resolveSearchSiteByHost } from "./site";

const siteA = {
  _id: "site-a",
  name: "Site A",
  key: "a",
  domains: ["a.test"],
  defaultLocale: "en-us",
  locales: [{ code: "en-us" }],
};

const siteB = {
  ...siteA,
  _id: "site-b",
  name: "Site B",
  key: "b",
  domains: ["b.test"],
  defaultLocale: "es-us",
  locales: [{ code: "es-us" }],
};

beforeEach(() => {
  cachedEntries.clear();
  publishedFetchMock.mockReset();
  sanityFetchMock.mockReset();
  draftModeMock.mockReset();
  draftModeMock.mockResolvedValue({ isEnabled: false });
  vi.stubEnv("NODE_ENV", "production");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("published Search Site lookup cache", () => {
  it("reuses the same published Site across independent requests", async () => {
    publishedFetchMock.mockResolvedValue(siteA);

    const first = await resolveSearchSiteByHost("HTTPS://A.TEST:443/anything");
    const second = await resolveSearchSiteByHost("a.test:443");

    expect(first).toEqual(siteA);
    expect(second).toEqual(siteA);
    expect(publishedFetchMock).toHaveBeenCalledTimes(1);
    expect(publishedFetchMock).toHaveBeenCalledWith(
      expect.stringContaining('_type == "site"'),
      { host: "a.test:443", hostname: "a.test" },
      { next: { revalidate: 0 } },
    );
    expect(sanityFetchMock).not.toHaveBeenCalled();
  });

  it("configures a tagged cache with a 60-second fallback expiration", async () => {
    // unstable_cache() is registered at module evaluation time. Vitest can
    // clear mocks before tests run, so import a fresh module *inside* the test.
    cacheOptionsMock.mockClear();
    vi.resetModules();
    await import("./site");

    expect(cacheOptionsMock).toHaveBeenCalledWith({
      tags: [PUBLIC_SEARCH_SITE_LOOKUP_TAG],
      revalidate: 60,
    });
  });

  it("keeps different domains and site locales isolated", async () => {
    publishedFetchMock.mockImplementation(async (...args: unknown[]) => {
      const params = args[1] as { hostname: string };
      return params.hostname === "a.test" ? siteA : siteB;
    });

    expect((await resolveSearchSiteByHost("a.test"))?._id).toBe("site-a");
    expect((await resolveSearchSiteByHost("b.test"))?._id).toBe("site-b");
    expect((await resolveSearchSiteByHost("a.test"))?.defaultLocale).toBe(
      "en-us",
    );
    expect(publishedFetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache draft-mode Site settings", async () => {
    draftModeMock.mockResolvedValue({ isEnabled: true });
    sanityFetchMock.mockResolvedValueOnce(siteA).mockResolvedValueOnce(siteB);

    expect(await resolveSearchSiteByHost("a.test")).toEqual(siteA);
    expect(await resolveSearchSiteByHost("a.test")).toEqual(siteB);
    expect(sanityFetchMock).toHaveBeenCalledTimes(2);
    expect(publishedFetchMock).not.toHaveBeenCalled();
  });

  it("does not cache Site lookups during development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    sanityFetchMock.mockResolvedValue(siteA);

    await resolveSearchSiteByHost("a.test");
    await resolveSearchSiteByHost("a.test");

    expect(sanityFetchMock).toHaveBeenCalledTimes(2);
    expect(publishedFetchMock).not.toHaveBeenCalled();
  });

  it("retries failed fetches rather than caching errors", async () => {
    publishedFetchMock
      .mockRejectedValueOnce(new Error("Sanity temporarily unavailable"))
      .mockResolvedValueOnce(siteA);

    await expect(resolveSearchSiteByHost("a.test")).rejects.toThrow(
      "Sanity temporarily unavailable",
    );
    expect(await resolveSearchSiteByHost("a.test")).toEqual(siteA);
    expect(publishedFetchMock).toHaveBeenCalledTimes(2);
  });
});
