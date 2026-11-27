#!/usr/bin/env node
/**
 * Proti v0.7.0 — Batch 3A read-only HTTP search baseline.
 *
 * Uses Node 20+ native fetch; no extra packages, no mutation, no CMS writes.
 * Runs against an already-running Web server with a configured Site host.
 *
 * Usage:
 *   node web/scripts/search-performance-baseline.mjs \
 *     --base-url http://localhost:3000 --locale us-en \
 *     --term nutrition --list-path /resources --json-out /tmp/proti-search-baseline.json
 */

import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

function usage() {
  return `Proti search baseline (read-only, Node 20+)

Required:
  --base-url URL            Running Proti origin (must resolve to a configured Site)

Optional:
  --locale CODE             Site locale; omitted means Site default
  --term STRING             Search term (default: nutrition)
  --list-path PATH          Existing public Page with a Dynamic Document List
  --samples N               Measured sequential requests per case (default: 7)
  --warmup N                Unmeasured warmup requests per case (default: 2)
  --delay-ms N              Pause between requests (default: 250)
  --json-out PATH           Save raw results and percentile summary as JSON
  --help                    Show this help

Tests /api/search for an empty term, a simple term, a multi-token term,
page 2, and newest sort; optionally tests an initial Dynamic Document List
page and its query route. No credentials are sent. Do not use private terms.
`;
}

function parseArguments(args) {
  const supported = new Set([
    "base-url",
    "locale",
    "term",
    "list-path",
    "samples",
    "warmup",
    "delay-ms",
    "json-out",
  ]);
  const values = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(usage());
      process.exit(0);
    }
    if (!arg.startsWith("--"))
      throw new Error(`Unexpected argument: ${arg}\n${usage()}`);
    const key = arg.slice(2);
    if (!supported.has(key)) throw new Error(`Unsupported option: ${arg}`);
    const value = args[++index];
    if (value === undefined || value.startsWith("--"))
      throw new Error(`Missing value for ${arg}`);
    values[key] = value;
  }
  if (!values["base-url"])
    throw new Error(`--base-url is required\n${usage()}`);
  for (const [name, fallback, minimum] of [
    ["samples", 7, 1],
    ["warmup", 2, 0],
    ["delay-ms", 250, 0],
  ]) {
    const text = values[name];
    if (text === undefined) {
      values[name] = fallback;
    } else if (
      !/^\d+$/.test(text) ||
      !Number.isSafeInteger(Number(text)) ||
      Number(text) < minimum
    ) {
      throw new Error(`--${name} must be an integer >= ${minimum}`);
    } else {
      values[name] = Number(text);
    }
  }
  const base = new URL(values["base-url"]);
  if (!/^https?:$/.test(base.protocol))
    throw new Error("--base-url must be HTTP or HTTPS");
  if (base.pathname !== "/" || base.search || base.hash) {
    throw new Error(
      "--base-url must be an origin (for example http://localhost:3000)",
    );
  }
  if (values["list-path"] && !values["list-path"].startsWith("/")) {
    throw new Error("--list-path must start with /");
  }
  return { ...values, baseUrl: base.origin, term: values.term ?? "nutrition" };
}

function makePath(pathname, parameters) {
  const url = new URL(pathname, "http://proti.local");
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null)
      url.searchParams.set(key, String(value));
  }
  return `${url.pathname}${url.search}`;
}

function percentile(values, proportion) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = Math.max(0, Math.ceil(proportion * sorted.length) - 1);
  return Math.round(sorted[index] * 10) / 10;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function timedRequest(url) {
  const start = performance.now();
  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(30_000),
  });
  const headerEnd = performance.now();
  const body = await response.arrayBuffer();
  const end = performance.now();
  return {
    status: response.status,
    ttfbMs: Math.round((headerEnd - start) * 10) / 10,
    totalMs: Math.round((end - start) * 10) / 10,
    bytes: body.byteLength,
    cacheControl: response.headers.get("cache-control"),
    serverTiming: response.headers.get("server-timing"),
    contentType: response.headers.get("content-type"),
  };
}

function summarize(samples) {
  return {
    statusCodes: [...new Set(samples.map((sample) => sample.status))],
    ttfbP50Ms: percentile(
      samples.map((sample) => sample.ttfbMs),
      0.5,
    ),
    ttfbP95Ms: percentile(
      samples.map((sample) => sample.ttfbMs),
      0.95,
    ),
    totalP50Ms: percentile(
      samples.map((sample) => sample.totalMs),
      0.5,
    ),
    totalP95Ms: percentile(
      samples.map((sample) => sample.totalMs),
      0.95,
    ),
    responseBytesP50: percentile(
      samples.map((sample) => sample.bytes),
      0.5,
    ),
  };
}

/**
 * Fail before the measured runs if a locale or Page path is invalid.
 * Otherwise a quick JSON error or Next.js 404 page could be mistaken for
 * an impressively fast search response.
 */
async function preflightCases(baseUrl, cases) {
  const failures = [];

  for (const current of cases) {
    const url = `${baseUrl}${current.path}`;
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(30_000),
    });

    if (response.status === 200) {
      await response.arrayBuffer();
      continue;
    }

    const body = (await response.text()).replace(/\s+/g, " ").slice(0, 300);
    failures.push(
      `- ${current.name}: HTTP ${response.status} ${url}\n  ${body}`,
    );
  }

  if (failures.length) {
    throw new Error(
      `Preflight failed; no benchmark samples collected.\n${failures.join("\n")}\n` +
        "Check the Site's configured locale codes and supply an existing published Page for --list-path. " +
        "You can omit --locale to use the Site default and omit --list-path to measure only the Search API.",
    );
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const locale = options.locale;
  const common = locale ? { locale } : {};
  const cases = [
    {
      name: "API empty query",
      path: makePath("/api/search", { ...common, q: "" }),
    },
    {
      name: "API basic query",
      path: makePath("/api/search", { ...common, q: options.term }),
    },
    {
      name: "API multi-token",
      path: makePath("/api/search", { ...common, q: `${options.term} health` }),
    },
    {
      name: "API page 2",
      path: makePath("/api/search", { ...common, q: options.term, page: 2 }),
    },
    {
      name: "API newest sort",
      path: makePath("/api/search", {
        ...common,
        q: options.term,
        sort: "newest",
      }),
    },
  ];
  if (options["list-path"]) {
    const listPath = options["list-path"];
    cases.push(
      { name: "Document List initial", path: makePath(listPath, {}) },
      {
        name: "Document List query",
        path: makePath(listPath, { q: options.term }),
      },
      {
        name: "Document List page 2",
        path: makePath(listPath, { q: options.term, page: 2 }),
      },
    );
  }
  await preflightCases(options.baseUrl, cases);
  const runs = [];
  console.log(
    `Proti search baseline: ${options.baseUrl}; ${options.samples} measured requests/case`,
  );
  for (const current of cases) {
    const url = `${options.baseUrl}${current.path}`;
    for (let i = 0; i < options.warmup; i++) {
      await timedRequest(url);
      if (options["delay-ms"]) await delay(options["delay-ms"]);
    }
    const samples = [];
    for (let i = 0; i < options.samples; i++) {
      samples.push(await timedRequest(url));
      if (options["delay-ms"]) await delay(options["delay-ms"]);
    }
    const summary = summarize(samples);
    runs.push({ name: current.name, path: current.path, ...summary, samples });
    console.log(
      `${current.name.padEnd(23)} status=${summary.statusCodes.join(",")} ttfb p50/p95=${summary.ttfbP50Ms}/${summary.ttfbP95Ms}ms total p50/p95=${summary.totalP50Ms}/${summary.totalP95Ms}ms bytes p50=${summary.responseBytesP50}`,
    );
  }
  const result = {
    benchmark: "Proti v0.7.0 Batch 3A HTTP baseline",
    capturedAt: new Date().toISOString(),
    origin: options.baseUrl,
    locale: locale ?? "site-default",
    warmupPerCase: options.warmup,
    samplesPerCase: options.samples,
    delayMs: options["delay-ms"],
    note: "Client-observed HTTP timing only. Does not measure Sanity query counts, React commit time, or browser interaction latency.",
    cases: runs,
  };
  if (options["json-out"]) {
    writeFileSync(
      options["json-out"],
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
    console.log(`Saved ${options["json-out"]}`);
  }
  if (runs.some((item) => item.statusCodes.some((status) => status !== 200))) {
    console.error(
      "One or more endpoints returned non-200. Check configured Site domain, locale, and Page route.",
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Benchmark failed: ${error.message}`);
  process.exitCode = 1;
});
