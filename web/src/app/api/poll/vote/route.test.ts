import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { readFetch, createIfNotExists, commit, patch, setIfMissing, inc, gate } =
  vi.hoisted(() => ({
    readFetch: vi.fn(),
    createIfNotExists: vi.fn(),
    commit: vi.fn(),
    patch: vi.fn(),
    setIfMissing: vi.fn(),
    inc: vi.fn(),
    gate: vi.fn(),
  }));

vi.mock("@/lib/polls/rate-limit", () => ({
  checkPollRateLimit: gate,
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    withConfig: (config: { token?: string }) =>
      config.token ? { createIfNotExists, patch } : { fetch: readFetch },
  },
}));

import { POST } from "./route";
import { POLL_COOKIE_NAME } from "@/lib/polls/visitor";

const data = {
  siteId: "site-123",
  locale: "en-us",
  pollKey: "helpful",
  optionId: "yes",
};
const secret = "a-test-server-secret-longer-than-thirty-two-characters";

function post(
  value: unknown = data,
  cookie = "",
  origin = "https://example.com",
) {
  return new Request("https://example.com/api/poll/vote", {
    method: "POST",
    headers: {
      origin,
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(value),
  });
}

function responseCookie(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
  expect(cookie.startsWith(`${POLL_COOKIE_NAME}=`)).toBe(true);
  return cookie;
}

describe("poll voting API with shared rate limiting", () => {
  beforeEach(() => {
    vi.stubEnv("POLL_VISITOR_SECRET", secret);
    vi.stubEnv("SANITY_API_WRITE_TOKEN", "test-write-token");
    vi.stubEnv("POLL_ALLOWED_ORIGINS", "https://example.com");
    gate.mockReset().mockResolvedValue("allowed");
    readFetch.mockReset().mockResolvedValue(true);
    createIfNotExists.mockReset().mockResolvedValue({});
    commit.mockReset().mockResolvedValue({ votes: { yes: 1 } });
    patch.mockReset().mockReturnValue({ setIfMissing, inc });
    setIfMissing.mockReset().mockReturnValue({ inc });
    inc.mockReset().mockReturnValue({ commit });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("allows the first vote after the shared rate-limit gate accepts it", async () => {
    const response = await POST(post());
    expect(response.status).toBe(200);
    expect(gate).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({
      votes: { yes: 1 },
      alreadyVoted: false,
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${POLL_COOKIE_NAME}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
    expect(cookie).toContain("Path=/");
    expect(createIfNotExists).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "pollResult",
        siteId: data.siteId,
        locale: data.locale,
        pollKey: data.pollKey,
      }),
    );
    expect(setIfMissing).toHaveBeenCalledWith({ "votes.yes": 0 });
    expect(inc).toHaveBeenCalledWith({ "votes.yes": 1 });
  });

  it("rejects rate-limited requests before querying Sanity", async () => {
    gate.mockResolvedValueOnce("limited");
    const response = await POST(post());
    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(readFetch).not.toHaveBeenCalled();
    expect(createIfNotExists).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("fails closed when the rate-limit gate is unavailable", async () => {
    gate.mockResolvedValueOnce("unavailable");
    const response = await POST(post());
    expect(response.status).toBe(503);
    expect(readFetch).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("checks the shared rate limit even for previously-voted browsers", async () => {
    const first = await POST(post());
    gate.mockResolvedValueOnce("limited");
    const second = await POST(post(data, responseCookie(first)));
    expect(second.status).toBe(429);
    expect(gate).toHaveBeenCalledTimes(2);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("returns current totals without incrementing for a browser that already voted", async () => {
    const first = await POST(post());
    const cookie = responseCookie(first);
    readFetch
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce({ votes: { yes: 17 } });
    const duplicate = await POST(post(data, cookie));
    expect(duplicate.status).toBe(200);
    expect(await duplicate.json()).toEqual({
      votes: { yes: 17 },
      alreadyVoted: true,
    });
    expect(commit).toHaveBeenCalledTimes(1);
    expect(duplicate.headers.get("set-cookie")).toBeNull();
  });

  it("tracks different polls in the same cookie and scopes a poll to its locale", async () => {
    const first = await POST(post());
    const second = await POST(
      post({ ...data, pollKey: "another" }, responseCookie(first)),
    );
    const secondCookie = responseCookie(second);
    expect((await POST(post(data, secondCookie))).status).toBe(200);
    expect(commit).toHaveBeenCalledTimes(2);
    const third = await POST(post({ ...data, locale: "es-us" }, secondCookie));
    expect(third.status).toBe(200);
    expect(commit).toHaveBeenCalledTimes(3);
  });

  it("rejects wrong origin, invalid data, and bad Content-Type without voting", async () => {
    expect((await POST(post(data, "", "https://evil.test"))).status).toBe(403);
    expect(
      (
        await POST(
          new Request("https://example.com/api/poll/vote", {
            method: "POST",
            headers: {
              origin: "https://example.com",
              "content-type": "text/plain",
            },
            body: "x",
          }),
        )
      ).status,
    ).toBe(415);
    expect((await POST(post({ ...data, optionId: "yes.no" }))).status).toBe(
      400,
    );
    expect(readFetch).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies including when Content-Length is absent", async () => {
    const response = await POST(
      new Request("https://example.com/api/poll/vote", {
        method: "POST",
        headers: {
          origin: "https://example.com",
          "content-type": "application/json",
        },
        body: "x".repeat(3000),
      }),
    );
    expect(response.status).toBe(413);
    expect(commit).not.toHaveBeenCalled();
  });

  it("refuses nonexistent and unpublished poll/option combinations", async () => {
    readFetch.mockResolvedValueOnce(false);
    expect((await POST(post())).status).toBe(404);
    expect(commit).not.toHaveBeenCalled();
  });

  it("fails closed if signing secret, write token, or Sanity is unavailable", async () => {
    vi.stubEnv("POLL_VISITOR_SECRET", "short");
    expect((await POST(post())).status).toBe(503);
    vi.stubEnv("POLL_VISITOR_SECRET", secret);
    vi.stubEnv("SANITY_API_WRITE_TOKEN", "");
    expect((await POST(post())).status).toBe(503);
    vi.stubEnv("SANITY_API_WRITE_TOKEN", "test-write-token");
    readFetch.mockRejectedValueOnce(new Error("network failed"));
    expect((await POST(post())).status).toBe(503);
    expect(commit).not.toHaveBeenCalled();
  });

  it("does not mark a vote as accepted on a failed Sanity mutation", async () => {
    commit.mockRejectedValueOnce(new Error("Sanity timed out"));
    const response = await POST(post());
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("uses atomic Sanity increments for simultaneous submissions, but does not promise cookie-level locking", async () => {
    let votes = 0;
    commit.mockImplementation(async () => ({ votes: { yes: ++votes } }));
    const [first, second] = await Promise.all([POST(post()), POST(post())]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(inc).toHaveBeenCalledTimes(2);
    expect(votes).toBe(2);
  });
});
