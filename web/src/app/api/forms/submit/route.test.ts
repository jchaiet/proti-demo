import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/forms/published-form", () => ({ findPublishedForm: vi.fn() }));
vi.mock("@/lib/forms/webhook", () => ({ forwardFormSubmission: vi.fn() }));

import { findPublishedForm } from "@/lib/forms/published-form";
import { forwardFormSubmission } from "@/lib/forms/webhook";
import { POST } from "./route";

const find = vi.mocked(findPublishedForm);
const forward = vi.mocked(forwardFormSubmission);
const payload = {
  formKey: "contact",
  blockKey: "key-123",
  siteId: "site-1",
  locale: "en-us",
  fields: { email: "person@example.com" },
  honeypot: "",
};

function request(
  body: unknown = payload,
  origin = "https://proti.test",
  target = "https://proti.test/api/forms/submit",
) {
  return new Request(target, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("FORM_ALLOWED_ORIGINS", "");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_URL", "");
  vi.stubEnv("VERCEL_BRANCH_URL", "");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("FORM_WEBHOOK_URL", "https://forms.example.test/receive");
  vi.stubEnv("FORM_WEBHOOK_SECRET", "test-secret");
  vi.stubEnv("FORM_WEBHOOK_DESTINATIONS", "");
  find.mockResolvedValue({
    _key: "key-123",
    fields: [
      { _type: "formInputField", name: "email", required: true, type: "email" },
    ],
  });
  forward.mockResolvedValue("ok");
});

afterEach(() => {
  vi.restoreAllMocks();
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
      { url: "https://forms.example.test/receive", secret: "test-secret" },
    );
    expect(JSON.stringify(forward.mock.calls[0][0])).not.toContain("honeypot");
  });

  it("allows explicit production origins and fails closed without configuration", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(request())).status).toBe(403);
    expect(find).not.toHaveBeenCalled();

    vi.stubEnv("FORM_ALLOWED_ORIGINS", "https://proti.test");
    expect((await POST(request())).status).toBe(200);
  });

  it("accepts the production deployment domain supplied by Vercel", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "proti-demo-web.vercel.app");

    expect(
      (await POST(request(payload, "https://proti-demo-web.vercel.app")))
        .status,
    ).toBe(200);
  });

  it("accepts an exact Vercel preview URL but not an unrelated preview", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "proti-git-feature-team.vercel.app");

    expect(
      (
        await POST(
          request(payload, "https://proti-git-feature-team.vercel.app"),
        )
      ).status,
    ).toBe(200);
    expect(
      (await POST(request(payload, "https://some-other-team.vercel.app")))
        .status,
    ).toBe(403);
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

  it("silently discards honeypot submissions without calling Sanity or the webhook", async () => {
    const response = await POST(
      request({ ...payload, honeypot: "spam.example" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(find).not.toHaveBeenCalled();
    expect(forward).not.toHaveBeenCalled();
  });

  it("rejects a malformed honeypot", async () => {
    expect((await POST(request({ ...payload, honeypot: ["x"] }))).status).toBe(
      400,
    );
    expect(forward).not.toHaveBeenCalled();
  });

  it("routes to a named destination selected in the published Sanity block", async () => {
    vi.stubEnv(
      "FORM_WEBHOOK_DESTINATIONS",
      JSON.stringify({
        contact: {
          url: "https://contact.example.test/receive",
          secret: "contact-secret",
          siteIds: ["site-1"],
        },
      }),
    );
    find.mockResolvedValue({
      _key: "key-123",
      webhookDestination: "contact",
      fields: [
        {
          _type: "formInputField",
          name: "email",
          type: "email",
          required: true,
        },
      ],
    });

    expect(
      (await POST(request({ ...payload, webhookDestination: "default" })))
        .status,
    ).toBe(200);
    expect(forward).toHaveBeenCalledWith(
      expect.objectContaining({ formKey: "contact", fields: payload.fields }),
      { url: "https://contact.example.test/receive", secret: "contact-secret" },
    );
  });

  it("rejects missing or unauthorized named destinations without falling back to default", async () => {
    find.mockResolvedValue({
      _key: "key-123",
      webhookDestination: "quotes",
      fields: [
        {
          _type: "formInputField",
          name: "email",
          type: "email",
          required: true,
        },
      ],
    });
    expect((await POST(request())).status).toBe(503);
    expect(forward).not.toHaveBeenCalled();

    vi.stubEnv(
      "FORM_WEBHOOK_DESTINATIONS",
      JSON.stringify({
        quotes: {
          url: "https://quotes.example.test/receive",
          secret: "quotes-secret",
          siteIds: ["another-site"],
        },
      }),
    );
    expect((await POST(request())).status).toBe(503);
    expect(forward).not.toHaveBeenCalled();
  });

  it("ignores a destination or URL forged in the browser request", async () => {
    expect(
      (
        await POST(
          request({
            ...payload,
            webhookDestination: "steal-data",
            webhookUrl: "https://attacker.test/collect",
          }),
        )
      ).status,
    ).toBe(200);
    expect(forward).toHaveBeenCalledWith(expect.any(Object), {
      url: "https://forms.example.test/receive",
      secret: "test-secret",
    });
  });

  it("supports older clients that do not send a honeypot", async () => {
    const legacyPayload = {
      formKey: payload.formKey,
      blockKey: payload.blockKey,
      siteId: payload.siteId,
      locale: payload.locale,
      fields: payload.fields,
    };
    expect((await POST(request(legacyPayload))).status).toBe(200);
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

  it("logs a privacy-safe request rejection without changing the response", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const response = await POST(request(payload, "https://attacker.test"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Submission origin is not allowed.",
    });
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(
      JSON.stringify({
        source: "proti.forms",
        event: "origin_rejected",
        stage: "request",
        status: 403,
      }),
    );
    expect(find).not.toHaveBeenCalled();
    expect(forward).not.toHaveBeenCalled();
  });

  it("logs unavailable destinations as configuration failures without secrets", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("FORM_WEBHOOK_SECRET", "do-not-log-this-secret");
    vi.stubEnv("FORM_WEBHOOK_URL", "");

    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Form submissions are not configured.",
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      JSON.stringify({
        source: "proti.forms",
        event: "destination_unconfigured",
        stage: "configuration",
        status: 503,
      }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain(
      "do-not-log-this-secret",
    );
    expect(forward).not.toHaveBeenCalled();
  });

  it("distinguishes webhook delivery failures from configuration failures", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    forward.mockResolvedValue("unavailable");

    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Unable to submit your form. Please try again.",
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      JSON.stringify({
        source: "proti.forms",
        event: "webhook_unavailable",
        stage: "delivery",
        status: 502,
      }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("person@example.com");
  });

  it("never logs Sanity exception messages, field values, or identifiers", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    find.mockRejectedValue(
      new Error("person@example.com, do-not-log-this-secret, site-1"),
    );

    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Form submissions are temporarily unavailable.",
    });
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      JSON.stringify({
        source: "proti.forms",
        event: "unexpected_failure",
        stage: "published_form",
        status: 503,
      }),
    );
    const recorded = JSON.stringify(error.mock.calls);
    for (const sensitive of [
      "person@example.com",
      "do-not-log-this-secret",
      "site-1",
    ]) {
      expect(recorded).not.toContain(sensitive);
    }
    expect(forward).not.toHaveBeenCalled();
  });

  it("reports thrown webhook failures at the delivery stage without exposing provider details", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    forward.mockRejectedValue(
      new Error(
        "Provider response contained person@example.com and secret-123",
      ),
    );

    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      JSON.stringify({
        source: "proti.forms",
        event: "unexpected_failure",
        stage: "delivery",
        status: 503,
      }),
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain(
      "person@example.com",
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain("secret-123");
  });

  it("logs validation failures without submitted field values", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const response = await POST(
      request({
        ...payload,
        fields: { email: "person@example.com", admin: "SECRET" },
      }),
    );
    expect(response.status).toBe(400);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(
      JSON.stringify({
        source: "proti.forms",
        event: "validation_rejected",
        stage: "validation",
        status: 400,
      }),
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("person@example.com");
    expect(JSON.stringify(info.mock.calls)).not.toContain("SECRET");
    expect(forward).not.toHaveBeenCalled();
  });

  it("keeps honeypot submissions indistinguishable to the client and logs no values", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const response = await POST(
      request({ ...payload, honeypot: "sensitive-spam-value" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(
      JSON.stringify({
        source: "proti.forms",
        event: "honeypot_discarded",
        stage: "request",
        status: 200,
      }),
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain(
      "sensitive-spam-value",
    );
    expect(find).not.toHaveBeenCalled();
    expect(forward).not.toHaveBeenCalled();
  });

  it("does not log personally identifying data for successful submissions", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(forward).toHaveBeenCalledTimes(1);
  });
});

describe("legacy File Upload submission safeguards", () => {
  it("returns an explicit configuration error without forwarding visitor data", async () => {
    find.mockResolvedValue({
      _key: "key-123",
      fields: [
        {
          _type: "formInputField",
          name: "email",
          type: "email",
          required: true,
        },
        { _type: "formFileUploadField", name: "attachment" },
      ],
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error:
        "This form is unavailable because file attachments are not supported.",
    });
    expect(forward).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      JSON.stringify({
        source: "proti.forms",
        event: "attachment_unsupported",
        stage: "configuration",
        status: 503,
      }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("person@example.com");
  });

  it("allows regular submissions when the legacy upload is disabled", async () => {
    find.mockResolvedValue({
      _key: "key-123",
      fields: [
        {
          _type: "formInputField",
          name: "email",
          type: "email",
          required: true,
        },
        { _type: "formFileUploadField", name: "attachment", disabled: true },
      ],
    });
    expect((await POST(request())).status).toBe(200);
    expect(forward).toHaveBeenCalledOnce();
  });
});
