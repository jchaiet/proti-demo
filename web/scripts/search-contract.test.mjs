import assert from "node:assert/strict";
import test from "node:test";
import { checkSearchContract, parseArgs } from "./search-contract-check.mjs";

const results = [
  {
    id: "post-1",
    type: "blog",
    title: "First Blog Post",
    href: "/blog/first",
    date: "2026-01-01",
  },
  {
    id: "page-1",
    type: "page",
    title: "Widget",
    href: "/products/widget",
    date: "2025-01-01",
  },
];

function fakeSearch(url) {
  const params = url.searchParams;
  const q = params.get("q") ?? "";
  if (
    q.length > 200 ||
    Number(params.get("page")) > 500 ||
    params.get("locale") === "unsupported-test"
  ) {
    return { status: 400, error: "Invalid request" };
  }
  const type = params.get("type");
  const matches = q
    ? results.filter((item) => !type || type === item.type)
    : [];
  const pageSize = Number(params.get("pageSize") ?? 12);
  const page = Number(params.get("page") ?? 1);
  const sort = params.get("sort") ?? "relevance";
  return {
    status: 200,
    body: {
      query: q,
      locale: params.get("locale") ?? "en-us",
      page,
      pageSize,
      total: matches.length,
      totalPages: Math.ceil(matches.length / pageSize),
      sort,
      filters: {
        types: type ? [type] : ["page", "blog"],
        taxonomy: [],
        taxonomyMatch: "any",
      },
      facets: { types: [], taxonomy: [] },
      results: matches.slice((page - 1) * pageSize, page * pageSize),
    },
  };
}

function fakeFetch(input) {
  const { status, error, body } = fakeSearch(new URL(input));
  return Promise.resolve({
    status,
    headers: new Headers({
      "cache-control": "no-store",
      "content-type": "application/json",
    }),
    async json() {
      return status === 200 ? structuredClone(body) : { error };
    },
  });
}

const options = {
  "base-url": "http://localhost:3000",
  term: "first",
  "expect-min-results": 2,
  "expect-title": ["First Blog Post", "Widget"],
  "invalid-locale": "unsupported-test",
};

test("checks real page 2, search response href, type filters, sorting, and guardrails", async () => {
  const report = await checkSearchContract(options, fakeFetch);
  assert.equal(report.genuinePagination, true);
  assert.equal(report.totalMatches, 2);
  assert.equal(report.signatures.basic.results[0].href, "/blog/first");
  assert.equal(report.checks.length, 10);
});

test("does not confuse null URL with valid href", async () => {
  const brokenFetch = async (input) => {
    const response = await fakeFetch(input);
    const data = await response.json();
    if (data.results?.length) data.results[0].href = "";
    return {
      ...response,
      async json() {
        return data;
      },
    };
  };
  await assert.rejects(
    checkSearchContract(options, brokenFetch),
    /Missing href/,
  );
});

test("validates CLI arguments", () => {
  const parsed = parseArgs([
    "--base-url",
    "http://localhost:3000",
    "--term",
    "first",
    "--expect-title",
    "Widget",
  ]);
  assert.equal(parsed["expect-min-results"], 1);
  assert.deepEqual(parsed["expect-title"], ["Widget"]);
});
