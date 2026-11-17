# Poll operational diagnostics (Proti v0.6.0, Stage 2B)

The existing `GET /api/poll/vote` (status) and `POST /api/poll/vote` (vote) endpoints now emit fixed, structured server-side diagnostic events for rejected requests, missing configuration, unavailable published polls, Sanity reads and writes, and repeated votes. They preserve the existing public status codes, JSON response shapes, signed cookie behavior, and atomic Sanity increments.

## Record format

Events are one-line JSON written to the server console:

```json
{
  "source": "proti.polls",
  "event": "mutation_unconfirmed",
  "stage": "mutation",
  "status": 503
}
```

The logger has **no free-text fields**. It never receives submitted vote identifiers, cookie values, IP addresses, origin URLs, Sanity document identifiers, API tokens, response bodies, or caught error objects. For this release, intentional repeat-vote attempts log an `info` event with only the fixed `duplicate_vote` code.

| Stage           | Relevant event codes                                                                                                        | Typical HTTP status |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `request`       | `status_query_rejected`, `origin_rejected`, `content_type_rejected`, `body_too_large`, `invalid_body`, `vote_data_rejected` | 400, 403, 413, 415  |
| `configuration` | `configuration_unavailable`                                                                                                 | 503                 |
| `lookup`        | `published_poll_missing`, `published_poll_lookup_failed`                                                                    | 404, 503            |
| `results`       | `results_unavailable`, `results_read_failed`, `duplicate_vote`                                                              | 503, 200            |
| `mutation`      | `mutation_unconfirmed`, `mutation_failed`                                                                                   | 503                 |

`info` events are emitted with `console.info`, expected upstream unavailability with `console.warn`, and caught exceptions with `console.error`. Thrown error details are **never** serialized. These are operational event severities, not additional HTTP response fields.

## Investigating failures

- `configuration_unavailable`: verify `POLL_VISITOR_SECRET` and `SANITY_API_WRITE_TOKEN` are configured. Do not print their values.
- `published_poll_missing`: ensure the requested option is published on a matching Page or Blog and uses the correct Site/Locale.
- `published_poll_lookup_failed`: investigate Sanity connectivity and the published-content lookup.
- `results_unavailable`: a signed prior-vote cookie exists but no usable totals were returned; do not display zero as a substitute.
- `results_read_failed`: a direct Sanity result read failed or returned corrupted totals.
- `mutation_unconfirmed`: Sanity did not return a confirmed incremented count. The endpoint did **not** issue a new voted cookie.
- `mutation_failed`: Sanity create/patch/commit did not complete successfully from the endpoint's perspective. A network timeout can occur after a write succeeds, so cookie-only deduplication **cannot guarantee exactly-once voting**.

## What does not change

- GET is read-only and never changes totals.
- POST checks origin, content type, body size, vote identifier, published Poll/Option, and signing/write-token settings before voting.
- A repeat vote with a signed cookie does not increment totals; it returns the current count and `alreadyVoted: true`.
- A successful new vote returns `alreadyVoted: false` and an HttpOnly signed cookie only after Sanity confirms a valid increment.
- No Redis, Upstash, new dependencies, new environment variables, or rate-limit enforcement are introduced.

## Test commands

```bash
pnpm --dir web exec vitest run src/app/api/poll/vote/route.test.ts
pnpm --dir web test:run
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
pnpm --dir web build
```

Log volume should be monitored before retaining `duplicate_vote` events long-term; a separate telemetry or rate-limiting system is not part of this stage.
