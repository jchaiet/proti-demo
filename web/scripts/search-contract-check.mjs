#!/usr/bin/env node
/**
 * Read-only Search API regression checks against a running production build.
 * No CMS mutations, no credentials, and no third-party dependencies.
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

function usage() {
  return `Proti Search API contract check (Node 20+)

Required:
  --base-url URL          Origin of running Proti Web server
  --term STRING           Known published Search term returning results

Optional:
  --locale CODE           Locale (omit for configured Site default)
  --expect-min-results N  Minimum results for the term (default: 1)
  --expect-title TITLE    Require a result title; can be repeated
  --invalid-locale CODE  Confirm unsupported locale returns HTTP 400
  --json-out PATH         Save check results and public-result signature
  --help                  Show this help

Requires at least two matching results to exercise genuine page-2 pagination;
with fewer results, page-2 checks are skipped and explicitly reported.
`;
}

export function parseArgs(argv) {
  const values = { "expect-title": [] };
  const keys = new Set([
    "base-url",
    "term",
    "locale",
    "expect-min-results",
    "expect-title",
    "invalid-locale",
    "json-out",
  ]);
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--help" || flag === "-h") return { help: true };
    if (!flag.startsWith("--") || !keys.has(flag.slice(2)))
      throw new Error(`Unrecognized option: ${flag}`);
    const value = argv[++i];
    if (value === undefined || value.startsWith("--"))
      throw new Error(`Missing value for ${flag}`);
    if (flag === "--expect-title") values["expect-title"].push(value);
    else values[flag.slice(2)] = value;
  }
  if (!values["base-url"] || !values.term)
    throw new Error("--base-url and --term are required");
  const base = new URL(values["base-url"]);
  if (
    !/^https?:$/.test(base.protocol) ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw new Error(
      "--base-url must be an HTTP(S) origin, e.g. http://localhost:3000",
    );
  values["base-url"] = base.origin;
  const text = values["expect-min-results"] ?? "1";
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text)))
    throw new Error("--expect-min-results must be a nonnegative integer");
  values["expect-min-results"] = Number(text);
  return values;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isNonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validateSuccessPayload(payload, expectedQuery) {
  assert(
    payload && typeof payload === "object",
    "Expected a JSON SearchResponse",
  );
  assert(
    payload.query === expectedQuery,
    `Expected query ${JSON.stringify(expectedQuery)}, got ${JSON.stringify(payload.query)}`,
  );
  assert(
    typeof payload.locale === "string" && payload.locale.length > 0,
    "Response is missing locale",
  );
  assert(isNonnegativeInteger(payload.total), "Response has invalid total");
  assert(
    isNonnegativeInteger(payload.totalPages),
    "Response has invalid totalPages",
  );
  assert(
    Number.isSafeInteger(payload.page) && payload.page > 0,
    "Response has invalid page",
  );
  assert(
    Number.isSafeInteger(payload.pageSize) && payload.pageSize > 0,
    "Response has invalid pageSize",
  );
  assert(Array.isArray(payload.results), "Response has no results array");
  assert(
    payload.results.length <= payload.pageSize,
    "Response exceeds pageSize",
  );
  assert(
    payload.results.length <= payload.total,
    "Response results exceed total",
  );
  assert(
    payload.filters &&
      Array.isArray(payload.filters.types) &&
      Array.isArray(payload.filters.taxonomy),
    "Response filters malformed",
  );
  assert(
    payload.facets &&
      Array.isArray(payload.facets.types) &&
      Array.isArray(payload.facets.taxonomy),
    "Response facets malformed",
  );
  const ids = new Set();
  for (const result of payload.results) {
    assert(
      typeof result.id === "string" && result.id.length > 0,
      "Result is missing id",
    );
    assert(!ids.has(result.id), `Duplicate result id ${result.id}`);
    ids.add(result.id);
    assert(
      ["page", "blog"].includes(result.type),
      `Unexpected public result type: ${result.type}`,
    );
    assert(
      typeof result.title === "string" && result.title.trim(),
      "Result is missing title",
    );
    assert(
      typeof result.href === "string" && result.href.trim(),
      `Missing href for ${result.id}`,
    );
    assert(
      result.href.startsWith("/") || /^https?:\/\//.test(result.href),
      `Invalid href for ${result.id}: ${result.href}`,
    );
  }
}

function resultSignature(payload) {
  return {
    locale: payload.locale,
    query: payload.query,
    total: payload.total,
    totalPages: payload.totalPages,
    sort: payload.sort,
    filters: payload.filters,
    facets: payload.facets,
    results: payload.results.map(
      ({ id, type, title, href, date, taxonomy, author }) => ({
        id,
        type,
        title,
        href,
        ...(date ? { date } : {}),
        taxonomy: Array.isArray(taxonomy)
          ? taxonomy.map((item) => item.id)
          : [],
        ...(author ? { authorId: author.id } : {}),
      }),
    ),
  };
}

export async function checkSearchContract(options, fetcher = fetch) {
  const origin = options["base-url"];
  const locale = options.locale;
  const common = locale ? { locale } : {};
  const checks = [];
  const warnings = [];
  const request = async (name, params, expectedStatus = 200) => {
    const url = new URL("/api/search", origin);
    for (const [key, value] of Object.entries({ ...common, ...params })) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(30_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    assert(
      contentType.includes("application/json"),
      `${name}: expected JSON response, got ${contentType}`,
    );
    const data = await response.json();
    assert(
      response.status === expectedStatus,
      `${name}: HTTP ${response.status}, expected ${expectedStatus}: ${JSON.stringify(data).slice(0, 180)}`,
    );
    if (expectedStatus === 200) {
      assert(
        (response.headers.get("cache-control") ?? "").includes("no-store"),
        `${name}: missing Cache-Control: no-store`,
      );
      validateSuccessPayload(data, String(params.q ?? ""));
    } else {
      assert(
        typeof data.error === "string" && data.error.length > 0,
        `${name}: expected a public error message`,
      );
    }
    checks.push(`${name}: HTTP ${expectedStatus}`);
    return data;
  };

  const empty = await request("Empty query", { q: "" });
  assert(
    empty.total === 0 && empty.results.length === 0,
    "Empty public search unexpectedly returned results",
  );
  const basic = await request("Basic search", { q: options.term });
  assert(
    basic.total >= options["expect-min-results"],
    `Expected at least ${options["expect-min-results"]} results, got ${basic.total}`,
  );
  if (locale)
    assert(
      basic.locale === locale,
      `Requested locale ${locale} was not returned`,
    );
  for (const title of options["expect-title"] ?? []) {
    assert(
      basic.results.some((item) => item.title === title),
      `Missing expected title: ${title}`,
    );
  }
  const newest = await request("Newest sort", {
    q: options.term,
    sort: "newest",
  });
  assert(newest.sort === "newest", "Newest sort was not preserved");
  assert(newest.total === basic.total, "Sorting changed the result count");
  if (basic.total <= basic.pageSize) {
    assert(
      basic.results
        .map((item) => item.id)
        .sort()
        .join("\0") ===
        newest.results
          .map((item) => item.id)
          .sort()
          .join("\0"),
      "Sorting changed which documents matched",
    );
  }
  const pagesOnly = await request("Page filter", {
    q: options.term,
    type: "page",
  });
  const blogsOnly = await request("Blog filter", {
    q: options.term,
    type: "blog",
  });
  assert(
    pagesOnly.results.every((result) => result.type === "page"),
    "Page filter returned another type",
  );
  assert(
    blogsOnly.results.every((result) => result.type === "blog"),
    "Blog filter returned another type",
  );
  assert(
    pagesOnly.total + blogsOnly.total === basic.total,
    "Type filters are inconsistent with total matches",
  );

  let genuinePagination = false;
  if (basic.total >= 2) {
    const first = await request("Real page 1 (pageSize=1)", {
      q: options.term,
      pageSize: 1,
      page: 1,
    });
    const second = await request("Real page 2 (pageSize=1)", {
      q: options.term,
      pageSize: 1,
      page: 2,
    });
    assert(
      first.total === basic.total && second.total === basic.total,
      "Pagination changed total results",
    );
    assert(
      first.results.length === 1 && second.results.length === 1,
      "Pagination did not return one item per page",
    );
    assert(
      first.results[0].id !== second.results[0].id,
      "Pages 1 and 2 contain the same document",
    );
    assert(
      second.page === 2 && second.totalPages >= 2,
      "Page 2 was not really selected",
    );
    genuinePagination = true;
  } else {
    warnings.push(
      "Genuine second-page pagination not checked: this query returns fewer than 2 documents.",
    );
  }
  await request("Too-large page rejected", { q: options.term, page: 501 }, 400);
  await request("Too-long query rejected", { q: "x".repeat(201) }, 400);
  if (options["invalid-locale"]) {
    await request(
      "Unsupported locale rejected",
      { q: options.term, locale: options["invalid-locale"] },
      400,
    );
  }

  return {
    capturedAt: new Date().toISOString(),
    origin,
    locale: basic.locale,
    term: options.term,
    totalMatches: basic.total,
    genuinePagination,
    checks,
    warnings,
    signatures: {
      basic: resultSignature(basic),
      newest: resultSignature(newest),
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return console.log(usage());
  const report = await checkSearchContract(options);
  console.log(
    `Search API contract passed: ${report.totalMatches} matches for ${JSON.stringify(report.term)} (${report.locale})`,
  );
  for (const check of report.checks) console.log(`  ✓ ${check}`);
  for (const warning of report.warnings) console.warn(`  ! ${warning}`);
  if (options["json-out"]) {
    writeFileSync(
      options["json-out"],
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    console.log(`Saved ${options["json-out"]}`);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(`Search API contract failed: ${error.message}`);
    process.exitCode = 1;
  });
}
