/**
 * Optional production integration preflight for `proti:check`.
 * Pure and side-effect free: no network requests, no mutations, no secret values
 * or user-supplied URLs are emitted. This checker verifies configuration
 * shape only; it does not perform live submissions or validate platform abuse controls.
 */

const FORM_DESTINATION_KEY = /^[a-z][a-z0-9_-]{0,63}$/;

// Historical settings retained for detection only. Neither API route uses
// these helpers. Their absence never makes Forms or Polls fail preflight.
const LEGACY_RATE_LIMIT_KEYS = [
  "FORM_UPSTASH_REDIS_REST_URL",
  "FORM_UPSTASH_REDIS_REST_TOKEN",
  "FORM_RATE_LIMIT_SALT",
  "FORM_TRUST_PROXY_HEADERS",
  "FORM_CLIENT_IP_HEADER",
  "POLL_UPSTASH_REDIS_REST_URL",
  "POLL_UPSTASH_REDIS_REST_TOKEN",
  "POLL_RATE_LIMIT_SALT",
  "POLL_TRUST_PROXY_HEADERS",
];
const INTEGRATION_ENV_KEYS = [
  "FORM_WEBHOOK_URL",
  "FORM_WEBHOOK_SECRET",
  "FORM_WEBHOOK_DESTINATIONS",
  "FORM_ALLOWED_ORIGINS",
  "POLL_VISITOR_SECRET",
  "POLL_ALLOWED_ORIGINS",
  ...LEGACY_RATE_LIMIT_KEYS,
  "SANITY_API_WRITE_TOKEN",
  "PROTI_VISUAL_FIXTURES",
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_BRANCH_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
];

const result = (level, label, detail) => ({ level, label, detail });
const defined = (environment, key) =>
  typeof environment[key] === "string" ? environment[key].trim() : "";
const has = (environment, key) => defined(environment, key) !== "";
const hasAny = (environment, keys) => keys.some((key) => has(environment, key));
const production = (env) =>
  defined(env, "NODE_ENV") === "production" ||
  defined(env, "VERCEL_ENV") === "production";

/** Return only an enum: never return or print sensitive URL fragments. */
function endpointStatus(value, { allowLocalHttp = false } = {}) {
  try {
    const url = new URL(value);
    if (!url.hostname || url.username || url.password) return "invalid";
    if (url.protocol === "https:") return "https";
    if (
      allowLocalHttp &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    ) {
      return "local-http";
    }
  } catch {
    // Invalid URL. Do not disclose it in diagnostics.
  }
  return "invalid";
}

function originStatus(value, isProduction) {
  try {
    const parsed = new URL(value);
    if (
      parsed.origin !== value ||
      parsed.username ||
      parsed.password ||
      (parsed.protocol !== "https:" &&
        !(
          parsed.protocol === "http:" &&
          !isProduction &&
          ["localhost", "127.0.0.1"].includes(parsed.hostname)
        ))
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function hasTrustedVercelOrigin(env) {
  if (defined(env, "VERCEL") !== "1") return false;
  return [
    "VERCEL_URL",
    "VERCEL_BRANCH_URL",
    ...(defined(env, "VERCEL_ENV") === "production"
      ? ["VERCEL_PROJECT_PRODUCTION_URL"]
      : []),
  ].some((key) => {
    const hostname = defined(env, key);
    return (
      hostname.length > 2 &&
      hostname.length <= 253 &&
      hostname.includes(".") &&
      !hostname.includes("..") &&
      /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i.test(hostname)
    );
  });
}

function checkOrigins(env, key, label, { fallbackOnVercel = false } = {}) {
  const values = defined(env, key);
  const isProduction = production(env);
  if (!values) {
    if (fallbackOnVercel && hasTrustedVercelOrigin(env)) {
      return result(
        "pass",
        label,
        "Trusted Vercel deployment origin is available.",
      );
    }
    return result(
      isProduction ? "fail" : "warn",
      label,
      `${key} is unset. Production requests require an explicit trusted origin${fallbackOnVercel ? " or a platform-provided Vercel hostname" : ""}.`,
    );
  }

  const origins = values.split(",").map((entry) => entry.trim());
  if (origins.some((origin) => !originStatus(origin, isProduction))) {
    return result(
      "fail",
      label,
      `${key} must contain comma-separated exact HTTPS origins (local HTTP is accepted only in development).`,
    );
  }
  return result("pass", label, `${origins.length} valid allowed origin(s).`);
}

function validateNamedDestinations(env) {
  const raw = defined(env, "FORM_WEBHOOK_DESTINATIONS");
  if (!raw) return { state: "unused", count: 0 };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: "invalid-json", count: 0 };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { state: "invalid-shape", count: 0 };
  }
  const entries = Object.entries(parsed);
  for (const [key, destination] of entries) {
    if (
      !FORM_DESTINATION_KEY.test(key) ||
      !destination ||
      typeof destination !== "object" ||
      Array.isArray(destination) ||
      typeof destination.secret !== "string" ||
      !destination.secret.trim() ||
      typeof destination.url !== "string" ||
      endpointStatus(destination.url, { allowLocalHttp: !production(env) }) ===
        "invalid" ||
      (Object.hasOwn(destination, "siteIds") &&
        (!Array.isArray(destination.siteIds) ||
          !destination.siteIds.length ||
          !destination.siteIds.every(
            (id) => typeof id === "string" && id.trim(),
          )))
    ) {
      return { state: "invalid-entry", count: 0 };
    }
  }
  return { state: "valid", count: entries.length };
}

function checkForms(env, output) {
  const defaultKeys = ["FORM_WEBHOOK_URL", "FORM_WEBHOOK_SECRET"];
  const configured =
    hasAny(env, defaultKeys) || has(env, "FORM_WEBHOOK_DESTINATIONS");

  if (!configured) {
    output.push(
      result(
        "pass",
        "Forms",
        "No webhook destinations configured (optional integration).",
      ),
    );
    if (has(env, "FORM_ALLOWED_ORIGINS")) {
      output.push(
        result(
          "warn",
          "Forms unused settings",
          "Form origin settings are present, but no webhook destination is configured.",
        ),
      );
    }
    return;
  }

  const anyDefault = hasAny(env, defaultKeys);
  if (anyDefault) {
    if (!defaultKeys.every((key) => has(env, key))) {
      output.push(
        result(
          "fail",
          "Form default webhook",
          "FORM_WEBHOOK_URL and FORM_WEBHOOK_SECRET must be set together.",
        ),
      );
    } else {
      const state = endpointStatus(defined(env, "FORM_WEBHOOK_URL"), {
        allowLocalHttp: !production(env),
      });
      output.push(
        state === "invalid"
          ? result(
              "fail",
              "Form default webhook",
              "Webhook URL must use HTTPS and contain no embedded credentials (local HTTP is development-only).",
            )
          : result(
              state === "local-http" ? "warn" : "pass",
              "Form default webhook",
              state === "local-http"
                ? "Local HTTP webhook works only in development; use HTTPS in production."
                : "URL and signing secret are configured.",
            ),
      );
    }
  }

  const named = validateNamedDestinations(env);
  if (
    ["invalid-json", "invalid-shape", "invalid-entry"].includes(named.state)
  ) {
    output.push(
      result(
        "fail",
        "Form named webhooks",
        "FORM_WEBHOOK_DESTINATIONS must be a valid JSON object with secure URLs, secrets, valid keys, and optional nonempty siteIds arrays. Do not wrap JSON in extra deployment-variable quotes.",
      ),
    );
  } else if (named.count) {
    output.push(
      result(
        "pass",
        "Form named webhooks",
        `${named.count} named destination(s) configured.`,
      ),
    );
  }

  if (!anyDefault && !named.count && named.state === "valid") {
    output.push(
      result(
        "warn",
        "Forms",
        "No usable form destination configured; FORM_WEBHOOK_DESTINATIONS is empty.",
      ),
    );
  }
  output.push(
    checkOrigins(env, "FORM_ALLOWED_ORIGINS", "Form origins", {
      fallbackOnVercel: true,
    }),
  );
  output.push(
    result(
      "warn",
      "Form abuse protection",
      "Application-level rate limiting is not enabled. Consider hosting-platform protections for public form endpoints.",
    ),
  );
}

function checkPolls(env, output) {
  const configured = hasAny(env, [
    "POLL_VISITOR_SECRET",
    "POLL_ALLOWED_ORIGINS",
  ]);
  if (!configured) {
    output.push(
      result(
        "pass",
        "Polls",
        "No poll-specific settings configured (optional integration).",
      ),
    );
    return;
  }
  if (defined(env, "POLL_VISITOR_SECRET").length < 32) {
    output.push(
      result(
        "fail",
        "Poll visitor signing",
        "POLL_VISITOR_SECRET must contain at least 32 characters.",
      ),
    );
  } else {
    output.push(
      result("pass", "Poll visitor signing", "Signing secret is configured."),
    );
  }
  if (!has(env, "SANITY_API_WRITE_TOKEN")) {
    output.push(
      result(
        "fail",
        "Poll Sanity mutations",
        "SANITY_API_WRITE_TOKEN is required when poll voting is enabled.",
      ),
    );
  } else {
    output.push(
      result(
        "pass",
        "Poll Sanity mutations",
        "Write token is configured (permissions are not tested).",
      ),
    );
  }
  output.push(checkOrigins(env, "POLL_ALLOWED_ORIGINS", "Poll origins"));
  output.push(
    result(
      "warn",
      "Poll vote deduplication",
      "Signed visitor cookies deter repeat votes but do not provide exact-once enforcement across browsers or cleared cookies.",
    ),
  );
}

/**
 * Read only named integration variables from the supplied environment.
 * Runtime environment values override web/.env.local if explicitly defined,
 * matching the platform's deployment variable precedence.
 */
export function integrationEnvironment(webEnv = {}, runtimeEnv = {}) {
  const combined = {};
  for (const key of INTEGRATION_ENV_KEYS) {
    if (typeof webEnv[key] === "string") combined[key] = webEnv[key];
    if (typeof runtimeEnv[key] === "string") combined[key] = runtimeEnv[key];
  }
  return combined;
}

export function checkIntegrationReadiness(webEnv = {}, runtimeEnv = {}) {
  const env = integrationEnvironment(webEnv, runtimeEnv);
  const output = [];
  checkForms(env, output);
  checkPolls(env, output);
  if (hasAny(env, LEGACY_RATE_LIMIT_KEYS)) {
    output.push(
      result(
        "warn",
        "Unused rate-limit settings",
        "Legacy Form/Poll Redis settings are present, but neither route uses Redis. Review and remove unused deployment secrets.",
      ),
    );
  }

  const fixtureFlag = defined(env, "PROTI_VISUAL_FIXTURES");
  if (fixtureFlag && fixtureFlag !== "0" && fixtureFlag !== "1") {
    output.push(
      result(
        "fail",
        "Visual fixtures",
        "PROTI_VISUAL_FIXTURES must be 0 or 1.",
      ),
    );
  } else if (fixtureFlag === "1") {
    output.push(
      result(
        production(env) ? "fail" : "warn",
        "Visual fixtures",
        "Fixture pages are enabled in this environment. Never enable fixtures in an ordinary production deployment.",
      ),
    );
  } else {
    output.push(
      result("pass", "Visual fixtures", "Not enabled in this environment."),
    );
  }
  return output;
}
