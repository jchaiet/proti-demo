import assert from "node:assert/strict";
import test from "node:test";

import {
  checkIntegrationReadiness,
  integrationEnvironment,
} from "./proti-integration-readiness.mjs";

const secret = "s".repeat(40);
const validForm = {
  FORM_WEBHOOK_URL: "https://hooks.example.test/submit",
  FORM_WEBHOOK_SECRET: secret,
  FORM_ALLOWED_ORIGINS: "https://example.test",
};
const validPoll = {
  POLL_VISITOR_SECRET: secret,
  POLL_ALLOWED_ORIGINS: "https://example.test",
  SANITY_API_WRITE_TOKEN: secret,
};
const check = (webEnv = {}, runtimeEnv = {}) =>
  checkIntegrationReadiness(webEnv, runtimeEnv);
const find = (results, label) => results.find((item) => item.label === label);

const cases = [
  {
    name: "optional forms and polls are disabled without errors or warnings",
    env: {},
    assert: (rows) => {
      assert.equal(find(rows, "Forms")?.level, "pass");
      assert.equal(find(rows, "Polls")?.level, "pass");
      assert.equal(find(rows, "Visual fixtures")?.level, "pass");
      assert.ok(rows.every(({ level }) => level === "pass"));
    },
  },
  {
    name: "secure default webhook is configured",
    env: validForm,
    assert: (rows) => {
      assert.equal(find(rows, "Form default webhook")?.level, "pass");
      assert.equal(find(rows, "Form origins")?.level, "pass");
    },
  },
  {
    name: "default webhook requires URL and secret together",
    env: { FORM_WEBHOOK_URL: "https://hooks.example.test/submit" },
    assert: (rows) =>
      assert.equal(find(rows, "Form default webhook")?.level, "fail"),
  },
  {
    name: "webhook rejects public plaintext HTTP",
    env: { ...validForm, FORM_WEBHOOK_URL: "http://hooks.example.test/submit" },
    assert: (rows) =>
      assert.equal(find(rows, "Form default webhook")?.level, "fail"),
  },
  {
    name: "webhook rejects embedded URL credentials",
    env: {
      ...validForm,
      FORM_WEBHOOK_URL: "https://user:secret@hooks.example.test",
    },
    assert: (rows) =>
      assert.equal(find(rows, "Form default webhook")?.level, "fail"),
  },
  {
    name: "valid named destinations do not require a default destination",
    env: {
      FORM_WEBHOOK_DESTINATIONS: JSON.stringify({
        notifications: {
          url: "https://hooks.example.test/a",
          secret,
          siteIds: ["site-acme"],
        },
      }),
      FORM_ALLOWED_ORIGINS: "https://example.test",
    },
    assert: (rows) => {
      assert.equal(find(rows, "Form named webhooks")?.level, "pass");
      assert.equal(find(rows, "Form default webhook"), undefined);
    },
  },
  {
    name: "extra quotes around destination JSON are rejected",
    env: {
      FORM_WEBHOOK_DESTINATIONS: `'${JSON.stringify({ notifications: { url: "https://hooks.example.test", secret } })}'`,
    },
    assert: (rows) =>
      assert.equal(find(rows, "Form named webhooks")?.level, "fail"),
  },
  {
    name: "named destination rejects invalid siteIds",
    env: {
      FORM_WEBHOOK_DESTINATIONS: JSON.stringify({
        notifications: {
          url: "https://hooks.example.test",
          secret,
          siteIds: "all",
        },
      }),
    },
    assert: (rows) =>
      assert.equal(find(rows, "Form named webhooks")?.level, "fail"),
  },
  {
    name: "malformed origin fails validation",
    env: { ...validForm, FORM_ALLOWED_ORIGINS: "https://example.test/section" },
    assert: (rows) => assert.equal(find(rows, "Form origins")?.level, "fail"),
  },
  {
    name: "missing explicit origins fails in production",
    env: { ...validForm, FORM_ALLOWED_ORIGINS: "" },
    runtime: { NODE_ENV: "production" },
    assert: (rows) => assert.equal(find(rows, "Form origins")?.level, "fail"),
  },
  {
    name: "valid Vercel-injected host supplies a Form origin in production",
    env: { ...validForm, FORM_ALLOWED_ORIGINS: "" },
    runtime: {
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_URL: "my-site.vercel.app",
    },
    assert: (rows) => assert.equal(find(rows, "Form origins")?.level, "pass"),
  },
  {
    name: "production forms do not require Redis",
    env: validForm,
    runtime: { NODE_ENV: "production" },
    assert: (rows) => {
      assert.equal(find(rows, "Form default webhook")?.level, "pass");
      assert.equal(find(rows, "Form abuse protection")?.level, "warn");
      assert.equal(find(rows, "Form rate-limit configuration"), undefined);
      assert.ok(rows.every(({ level }) => level !== "fail"));
    },
  },
  {
    name: "stale Form Redis configuration only warns and never blocks production",
    env: {
      ...validForm,
      FORM_UPSTASH_REDIS_REST_URL: "https://unused.example.test",
    },
    runtime: { NODE_ENV: "production" },
    assert: (rows) => {
      assert.equal(find(rows, "Unused rate-limit settings")?.level, "warn");
      assert.ok(rows.every(({ level }) => level !== "fail"));
    },
  },
  {
    name: "valid poll signing and origin settings pass",
    env: validPoll,
    assert: (rows) => {
      assert.equal(find(rows, "Poll visitor signing")?.level, "pass");
      assert.equal(find(rows, "Poll origins")?.level, "pass");
      assert.equal(find(rows, "Poll vote deduplication")?.level, "warn");
    },
  },
  {
    name: "poll with short signing secret is rejected",
    env: { ...validPoll, POLL_VISITOR_SECRET: "short" },
    assert: (rows) =>
      assert.equal(find(rows, "Poll visitor signing")?.level, "fail"),
  },
  {
    name: "poll requires Sanity write token",
    env: { ...validPoll, SANITY_API_WRITE_TOKEN: "" },
    assert: (rows) =>
      assert.equal(find(rows, "Poll Sanity mutations")?.level, "fail"),
  },
  {
    name: "poll origin is required in production",
    env: { ...validPoll, POLL_ALLOWED_ORIGINS: "" },
    runtime: { NODE_ENV: "production" },
    assert: (rows) => assert.equal(find(rows, "Poll origins")?.level, "fail"),
  },
  {
    name: "production polls do not require Redis",
    env: validPoll,
    runtime: { NODE_ENV: "production" },
    assert: (rows) => {
      assert.equal(find(rows, "Poll vote deduplication")?.level, "warn");
      assert.equal(find(rows, "Poll rate-limit configuration"), undefined);
      assert.ok(rows.every(({ level }) => level !== "fail"));
    },
  },
  {
    name: "only stale Poll Redis variables cause a warning, not a configured poll",
    env: { POLL_UPSTASH_REDIS_REST_TOKEN: secret },
    runtime: { NODE_ENV: "production" },
    assert: (rows) => {
      assert.equal(find(rows, "Polls")?.level, "pass");
      assert.equal(find(rows, "Unused rate-limit settings")?.level, "warn");
      assert.ok(rows.every(({ level }) => level !== "fail"));
    },
  },
  {
    name: "visual fixtures enabled in production is a failure",
    env: { PROTI_VISUAL_FIXTURES: "1" },
    runtime: { VERCEL_ENV: "production" },
    assert: (rows) =>
      assert.equal(find(rows, "Visual fixtures")?.level, "fail"),
  },
  {
    name: "visual fixtures enabled for local screenshot tests are warnings",
    env: { PROTI_VISUAL_FIXTURES: "1" },
    assert: (rows) =>
      assert.equal(find(rows, "Visual fixtures")?.level, "warn"),
  },
  {
    name: "invalid fixture flag value fails",
    env: { PROTI_VISUAL_FIXTURES: "yes" },
    assert: (rows) =>
      assert.equal(find(rows, "Visual fixtures")?.level, "fail"),
  },
];

for (const scenario of cases) {
  test(scenario.name, () =>
    scenario.assert(check(scenario.env, scenario.runtime)),
  );
}

test("runtime environment overrides project .env.local values", () => {
  const combined = integrationEnvironment(
    {
      FORM_WEBHOOK_URL: "https://old.example.test",
      PROTI_VISUAL_FIXTURES: "1",
    },
    {
      FORM_WEBHOOK_URL: "https://new.example.test",
      PROTI_VISUAL_FIXTURES: "0",
    },
  );
  assert.equal(combined.FORM_WEBHOOK_URL, "https://new.example.test");
  assert.equal(combined.PROTI_VISUAL_FIXTURES, "0");
});

test("diagnostics never expose secrets, destination URLs or raw JSON", () => {
  const sensitive = {
    ...validForm,
    FORM_WEBHOOK_SECRET: "very-private-webhook-secret",
    FORM_WEBHOOK_URL:
      "https://user:password@private.example.test?access-token=secret",
    FORM_WEBHOOK_DESTINATIONS: '{"secret":"another-private-secret"}',
    ...validPoll,
    POLL_VISITOR_SECRET: "very-private-poll-secret-more-than-32-chars",
  };
  const output = JSON.stringify(check(sensitive, { NODE_ENV: "production" }));
  for (const entry of [
    "very-private-webhook-secret",
    "private.example.test",
    "access-token",
    "another-private-secret",
    "very-private-poll-secret",
    "password",
  ]) {
    assert.equal(
      output.includes(entry),
      false,
      `Sensitive value leaked: ${entry}`,
    );
  }
});

test("legacy Redis variables are not exposed by the environment diagnostic", () => {
  const hidden = "hidden-redis-rest-token-DO-NOT-PRINT";
  const rows = checkIntegrationReadiness(
    { ...validForm, FORM_UPSTASH_REDIS_REST_TOKEN: hidden },
    { NODE_ENV: "production" },
  );
  assert.equal(find(rows, "Unused rate-limit settings")?.level, "warn");
  assert.equal(JSON.stringify(rows).includes(hidden), false);
});
