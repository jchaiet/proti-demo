import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/forms/published-form", () => ({ findPublishedForm: vi.fn() }));
vi.mock("@/lib/forms/rate-limit", () => ({ checkFormRateLimit: vi.fn() }));
vi.mock("@/lib/forms/webhook", () => ({ forwardFormSubmission: vi.fn() }));

import { findPublishedForm } from "@/lib/forms/published-form";
import { checkFormRateLimit } from "@/lib/forms/rate-limit";
import { forwardFormSubmission } from "@/lib/forms/webhook";
import { POST } from "./route";

const find = vi.mocked(findPublishedForm);
const limit = vi.mocked(checkFormRateLimit);
const forward = vi.mocked(forwardFormSubmission);
const payload = {
  formKey: "contact",
  blockKey: "key-123",
  siteId: "site-1",
  locale: "en-us",
  fields: { email: "person@example.com" },
};

function request(body: unknown = payload, origin = "https://proti.test") {
  return new Request("https://proti.test/api/forms/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("FORM_WEBHOOK_URL", "https://forms.example.test/receive");
  vi.stubEnv("FORM_WEBHOOK_SECRET", "test-secret");
  find.mockResolvedValue({
    _key: "key-123",
    fields: [
      { _type: "formInputField", name: "email", required: true, type: "email" },
    ],
  });
  limit.mockResolvedValue("allowed");
  forward.mockResolvedValue("ok");
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/forms/submit", () => {
  it("forwards only fields validated against the published form", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(find).toHaveBeenCalledWith({
      formKey: "contact",
      blockKey: "key-123",
      siteId: "site-1",
      locale: "en-us",
    });
    expect(forward).toHaveBeenCalledWith(
      expect.objectContaining({ fields: payload.fields, formKey: "contact" }),
    );
  });

  it("requires an explicit production origin allowlist", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FORM_ALLOWED_ORIGINS", "");
    expect((await POST(request())).status).toBe(403);
    expect(find).not.toHaveBeenCalled();

    vi.stubEnv("FORM_ALLOWED_ORIGINS", "https://proti.test");
    expect((await POST(request())).status).toBe(200);
  });

  it("rejects misleading JSON content types", async () => {
    const bad = new Request("https://proti.test/api/forms/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/jsonp",
        Origin: "https://proti.test",
      },
      body: JSON.stringify(payload),
    });
    expect((await POST(bad)).status).toBe(415);
    expect(forward).not.toHaveBeenCalled();
  });

  it("rejects cross-origin posts", async () => {
    expect((await POST(request(payload, "https://attacker.test"))).status).toBe(
      403,
    );
    expect(find).not.toHaveBeenCalled();
  });

  it("rejects unknown field names rather than forwarding them", async () => {
    const response = await POST(
      request({ ...payload, fields: { ...payload.fields, admin: "yes" } }),
    );
    expect(response.status).toBe(400);
    expect(forward).not.toHaveBeenCalled();
  });

  it("rejects missing published forms", async () => {
    find.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(404);
    expect(forward).not.toHaveBeenCalled();
  });

  it("limits repeated submissions", async () => {
    limit.mockResolvedValue("limited");
    expect((await POST(request())).status).toBe(429);
    expect(find).not.toHaveBeenCalled();
  });

  it("fails closed when the limiter is unavailable", async () => {
    limit.mockResolvedValue("unavailable");
    expect((await POST(request())).status).toBe(503);
    expect(forward).not.toHaveBeenCalled();
  });

  it("does not accept a form without a webhook configuration", async () => {
    vi.stubEnv("FORM_WEBHOOK_SECRET", "");
    expect((await POST(request())).status).toBe(503);
    expect(forward).not.toHaveBeenCalled();
  });

  it("returns a generic error if the delivery provider fails", async () => {
    forward.mockResolvedValue("unavailable");
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain(
      "person@example.com",
    );
  });

  it("rejects oversized bodies", async () => {
    const response = await POST(
      request({ ...payload, fields: { email: "a".repeat(45_000) } }),
    );
    expect(response.status).toBe(413);
    expect(find).not.toHaveBeenCalled();
  });
});
