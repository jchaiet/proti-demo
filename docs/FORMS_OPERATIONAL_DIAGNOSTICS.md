# Forms operational diagnostics (Proti v0.6.0, Stage 2A)

This change adds structured logs to `POST /api/forms/submit` without changing
its request/response API, Sanity lookup, webhook signature, or origin rules.

## Scope

- **No Redis or additional service** is required or introduced.
- No rate limiting is added. Keep platform-level abuse protection as a separate decision.
- Failed requests emit a single JSON object to the server console. Successful
  form delivery does not log anything. Honeypot requests still return the same
  success response and never reach Sanity or the webhook.
- The log schema is fixed: `source`, `event`, `stage`, `status`. It has no free-text
  fields; in particular, **never add form data, cookies, IP addresses, request
  headers, identifiers, webhook URLs, tokens, destination secrets, raw exception
  messages, or upstream response bodies to these logs**.
- HTTP responses and caching headers are unchanged. The previous generic
  503 response for an unexpected backend exception is retained.

## Example records

```json
{"source":"proti.forms","event":"destination_unconfigured","stage":"configuration","status":503}
{"source":"proti.forms","event":"webhook_unavailable","stage":"delivery","status":502}
{"source":"proti.forms","event":"unexpected_failure","stage":"published_form","status":503}
```

Search server logs for `"source":"proti.forms"`, then aggregate by `event`
and `status` to distinguish configuration from delivery and CMS failures.

An `unexpected_failure` at the `delivery` stage indicates that the forwarding
function threw rather than returning its normal `unavailable` result. A 502
`webhook_unavailable` means the forwarding function returned `unavailable`;
that does not distinguish a timeout from an upstream HTTP error because the
existing webhook interface intentionally returns only `ok`/`unavailable`.

Some rejected requests (4xx) and honeypot requests (200) produce informational
logs. On a high-traffic site, be mindful of logging volume and platform log
retention/costs. This is not a substitute for abuse prevention or rate limiting.

## Files

- `web/src/lib/forms/diagnostics.ts` — fixed-schema server logging helper.
- `web/src/app/api/forms/submit/route.ts` — operation-stage logging.
- `web/src/app/api/forms/submit/route.test.ts` — privacy and response tests.

## Validate

From the repository root:

```bash
pnpm --dir web exec vitest run src/app/api/forms/submit/route.test.ts
pnpm --dir web test:run
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
pnpm --dir web build
```

A successful form submission should still return `{ "success": true }`.
Failures should retain their existing HTTP status and response body. Only
server-side, sanitized diagnostics have been added.

## Updating the test file

The most recent source ZIP contained old Redis-specific test assertions even
though the production API route had already been reverted. The test file in
this package is based on the verified Redis-free test replacement from the
previous cleanup, **not** the stale copy in the ZIP.
