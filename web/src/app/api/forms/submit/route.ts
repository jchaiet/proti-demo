import { NextResponse } from "next/server";

import { findPublishedForm } from "@/lib/forms/published-form";
import { formOriginAllowed } from "@/lib/forms/origin";
import { resolveFormWebhookDestination } from "@/lib/forms/destinations";
import { validateFormValues } from "@/lib/forms/validation";
import { forwardFormSubmission } from "@/lib/forms/webhook";
import {
  logFormDiagnostic,
  type FormDiagnosticEvent,
  type FormDiagnosticSeverity,
  type FormDiagnosticStage,
} from "@/lib/forms/diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 40 * 1024;
const IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;

type SubmissionBody = {
  formKey?: unknown;
  blockKey?: unknown;
  siteId?: unknown;
  locale?: unknown;
  fields?: unknown;
  honeypot?: unknown;
};

function reply(
  message: string,
  status: number,
  event: FormDiagnosticEvent,
  stage: FormDiagnosticStage,
  severity: FormDiagnosticSeverity = status >= 500 ? "warn" : "info",
) {
  logFormDiagnostic(event, stage, status, severity);
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!formOriginAllowed(request))
    return reply(
      "Submission origin is not allowed.",
      403,
      "origin_rejected",
      "request",
    );
  if (
    !/^application\/json(?:\s*;|\s*$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  ) {
    return reply("Expected JSON.", 415, "content_type_rejected", "request");
  }
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_BYTES)
    return reply("Submission is too large.", 413, "body_too_large", "request");

  let body: SubmissionBody;
  try {
    // A missing/forged Content-Length cannot bypass the payload limit.
    // Read the stream only up to MAX_BYTES; never buffer an unlimited body.
    const reader = request.body?.getReader();
    if (!reader)
      return reply("Invalid request body.", 400, "invalid_body", "request");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel().catch(() => undefined);
        return reply(
          "Submission is too large.",
          413,
          "body_too_large",
          "request",
        );
      }
      chunks.push(value);
    }
    body = JSON.parse(
      Buffer.concat(chunks, size).toString("utf8"),
    ) as SubmissionBody;
  } catch {
    return reply("Invalid request body.", 400, "invalid_body", "request");
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    ![body.formKey, body.blockKey, body.siteId, body.locale].every(
      (value) => typeof value === "string" && IDENTIFIER.test(value),
    )
  ) {
    return reply(
      "Invalid form identifier.",
      400,
      "invalid_identifier",
      "request",
    );
  }
  const formKey = body.formKey as string;
  const blockKey = body.blockKey as string;
  const siteId = body.siteId as string;
  const locale = body.locale as string;

  // The visually-hidden browser field is deliberately outside the CMS fields
  // object; CMS-submitted field names continue to be validated strictly.
  // Older clients may omit the honeypot during rollout.
  if (body.honeypot !== undefined && typeof body.honeypot !== "string") {
    return reply("Invalid request body.", 400, "invalid_honeypot", "request");
  }
  if (typeof body.honeypot === "string" && body.honeypot.length > 0) {
    // Avoid confirming the trap to automated submitters. Nothing is forwarded.
    logFormDiagnostic("honeypot_discarded", "request", 200, "info");
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let stage: FormDiagnosticStage = "published_form";
  try {
    const form = await findPublishedForm({ formKey, blockKey, siteId, locale });
    if (!form)
      return reply(
        "This form is not available.",
        404,
        "published_form_missing",
        "published_form",
      );

    // The destination comes only from the verified, published Sanity block.
    // Ignore any webhookDestination/URL sent in the browser request body.
    stage = "configuration";
    const destination = resolveFormWebhookDestination(
      form.webhookDestination,
      siteId,
    );
    if (!destination)
      return reply(
        "Form submissions are not configured.",
        503,
        "destination_unconfigured",
        "configuration",
      );

    stage = "validation";
    const validated = validateFormValues(form, body.fields);
    if (!validated.ok) {
      if (validated.code === "unsupported_file_upload")
        return reply(
          validated.error,
          503,
          "attachment_unsupported",
          "configuration",
        );
      return reply(validated.error, 400, "validation_rejected", "validation");
    }

    stage = "delivery";
    const result = await forwardFormSubmission(
      {
        formKey,
        blockKey,
        siteId,
        locale,
        fields: validated.values,
        submittedAt: new Date().toISOString(),
      },
      destination,
    );
    if (result !== "ok")
      return reply(
        "Unable to submit your form. Please try again.",
        502,
        "webhook_unavailable",
        "delivery",
      );
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Log only the fixed failure stage; never serialize the caught error.
    return reply(
      "Form submissions are temporarily unavailable.",
      503,
      "unexpected_failure",
      stage,
      "error",
    );
  }
}
