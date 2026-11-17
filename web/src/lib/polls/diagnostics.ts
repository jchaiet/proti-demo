/**
 * Privacy-safe operational events for Poll status and voting endpoints.
 *
 * Only fixed event/stage/status values are logged. Never pass vote identifiers,
 * visitor cookies, IP addresses, URLs, Sanity document IDs, tokens, or thrown
 * errors to this logger.
 */
export type PollDiagnosticStage =
  | "request"
  | "configuration"
  | "lookup"
  | "results"
  | "mutation";

export type PollDiagnosticEvent =
  | "status_query_rejected"
  | "origin_rejected"
  | "content_type_rejected"
  | "body_too_large"
  | "invalid_body"
  | "vote_data_rejected"
  | "configuration_unavailable"
  | "published_poll_missing"
  | "published_poll_lookup_failed"
  | "results_unavailable"
  | "results_read_failed"
  | "duplicate_vote"
  | "mutation_unconfirmed"
  | "mutation_failed";

export type PollDiagnosticSeverity = "info" | "warn" | "error";

export function logPollDiagnostic(
  event: PollDiagnosticEvent,
  stage: PollDiagnosticStage,
  status: number,
  severity: PollDiagnosticSeverity,
): void {
  const record = JSON.stringify({
    source: "proti.polls",
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
