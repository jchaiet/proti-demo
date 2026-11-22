/**
 * Privacy-safe operational events for the Forms submission endpoint.
 *
 * Never pass request data, form values, email addresses, site identifiers,
 * URLs, secrets, headers, cookies, or thrown errors to this logger.
 * Its fixed event/stage/status schema deliberately has no free-text fields.
 */
export type FormDiagnosticStage =
  | "request"
  | "published_form"
  | "configuration"
  | "validation"
  | "delivery";

export type FormDiagnosticEvent =
  | "origin_rejected"
  | "content_type_rejected"
  | "body_too_large"
  | "invalid_body"
  | "invalid_identifier"
  | "invalid_honeypot"
  | "honeypot_discarded"
  | "published_form_missing"
  | "destination_unconfigured"
  | "validation_rejected"
  | "attachment_unsupported"
  | "webhook_unavailable"
  | "unexpected_failure";

export type FormDiagnosticSeverity = "info" | "warn" | "error";

export function logFormDiagnostic(
  event: FormDiagnosticEvent,
  stage: FormDiagnosticStage,
  status: number,
  severity: FormDiagnosticSeverity,
): void {
  const record = JSON.stringify({
    source: "proti.forms",
    event,
    stage,
    status,
  });

  if (severity === "error") {
    console.error(record);
  } else if (severity === "warn") {
    console.warn(record);
  } else {
    console.info(record);
  }
}
