#!/usr/bin/env node
/**
 * Compare two outputs of search-performance-baseline.mjs.
 * Read-only: no network requests and no CMS access.
 * Node.js 20+; no third-party dependencies.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const METRICS = ["totalP50Ms", "totalP95Ms", "ttfbP50Ms", "ttfbP95Ms"];

function usage() {
  return `Proti search performance comparison (Node 20+)

Required:
  --before PATH                 Baseline JSON from search-performance-baseline.mjs
  --after PATH                  Optimized JSON from the same benchmark

Optional:
  --json-out PATH               Save machine-readable comparison
  --max-p50-regression-pct N    Fail if a case's total p50 regresses by more than N%
  --min-regression-ms N         Ignore increases smaller than N ms (default: 15)
  --help                        Print this help

Only identical origins, locales and case URL paths can be compared. Both
runs must have HTTP 200 responses for every case. p95 is diagnostic; do
not treat it as a hard gate with small sample counts.
`;
}

export function parseArgs(argv) {
  const values = {};
  const keys = new Set([
    "before",
    "after",
    "json-out",
    "max-p50-regression-pct",
    "min-regression-ms",
  ]);
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--help" || flag === "-h") return { help: true };
    if (!flag.startsWith("--") || !keys.has(flag.slice(2))) {
      throw new Error(`Unrecognized argument: ${flag}`);
    }
    const value = argv[++i];
    if (!value || value.startsWith("--"))
      throw new Error(`Missing value for ${flag}`);
    values[flag.slice(2)] = value;
  }
  if (!values.before || !values.after)
    throw new Error("--before and --after are required");
  for (const field of ["max-p50-regression-pct", "min-regression-ms"]) {
    if (values[field] !== undefined) {
      if (
        !/^\d+(?:\.\d+)?$/.test(values[field]) ||
        !Number.isFinite(Number(values[field]))
      ) {
        throw new Error(`--${field} must be a nonnegative number`);
      }
      values[field] = Number(values[field]);
    }
  }
  return values;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function asCases(run, label) {
  assert(run && typeof run === "object", `${label}: invalid benchmark JSON`);
  assert(typeof run.origin === "string", `${label}: missing origin`);
  assert(typeof run.locale === "string", `${label}: missing locale`);
  assert(
    Array.isArray(run.cases) && run.cases.length > 0,
    `${label}: missing cases`,
  );
  const byName = new Map();
  for (const item of run.cases) {
    assert(
      typeof item.name === "string" && item.name.length > 0,
      `${label}: unnamed case`,
    );
    assert(!byName.has(item.name), `${label}: duplicate case ${item.name}`);
    assert(
      typeof item.path === "string",
      `${label}: ${item.name} has no URL path`,
    );
    assert(
      Array.isArray(item.statusCodes) &&
        item.statusCodes.length === 1 &&
        item.statusCodes[0] === 200,
      `${label}: ${item.name} did not return only HTTP 200`,
    );
    for (const field of METRICS) {
      assert(
        Number.isFinite(item[field]) && item[field] >= 0,
        `${label}: ${item.name} has invalid ${field}`,
      );
    }
    assert(
      Number.isFinite(item.responseBytesP50) && item.responseBytesP50 >= 0,
      `${label}: ${item.name} has invalid responseBytesP50`,
    );
    byName.set(item.name, item);
  }
  return byName;
}

const round = (number) => Math.round(number * 10) / 10;

export function compareRuns(before, after, options = {}) {
  const baseline = asCases(before, "Before");
  const optimized = asCases(after, "After");
  assert(
    before.origin === after.origin,
    `Origins differ: ${before.origin} vs ${after.origin}`,
  );
  assert(
    before.locale === after.locale,
    `Locales differ: ${before.locale} vs ${after.locale}`,
  );
  assert(
    baseline.size === optimized.size,
    "Different number of benchmark cases",
  );

  const regressions = [];
  const warnings = [];
  const cases = [];
  const threshold = options.maxP50RegressionPct;
  const minDeltaMs = options.minRegressionMs ?? 15;

  for (const [name, oldCase] of baseline) {
    const newCase = optimized.get(name);
    assert(newCase, `Missing optimized case: ${name}`);
    assert(
      oldCase.path === newCase.path,
      `${name}: query paths differ (${oldCase.path} vs ${newCase.path}); rerun with identical flags`,
    );
    const metrics = {};
    for (const field of METRICS) {
      const oldValue = oldCase[field];
      const newValue = newCase[field];
      metrics[field] = {
        before: oldValue,
        after: newValue,
        savedMs: round(oldValue - newValue),
        improvementPct:
          oldValue === 0
            ? null
            : round(((oldValue - newValue) / oldValue) * 100),
      };
    }
    if (oldCase.responseBytesP50 !== newCase.responseBytesP50) {
      warnings.push(
        `${name}: median response size changed from ${oldCase.responseBytesP50} to ${newCase.responseBytesP50} bytes. Check content and result consistency.`,
      );
    }
    if (
      threshold !== undefined &&
      newCase.totalP50Ms - oldCase.totalP50Ms >= minDeltaMs &&
      oldCase.totalP50Ms > 0 &&
      ((newCase.totalP50Ms - oldCase.totalP50Ms) / oldCase.totalP50Ms) * 100 >
        threshold
    ) {
      regressions.push(
        `${name}: total p50 regressed by ${metrics.totalP50Ms.improvementPct * -1}%`,
      );
    }
    cases.push({
      name,
      path: oldCase.path,
      metrics,
      beforeBytes: oldCase.responseBytesP50,
      afterBytes: newCase.responseBytesP50,
    });
  }
  if (before.samplesPerCase !== after.samplesPerCase) {
    warnings.push(
      `Sample counts differ (${before.samplesPerCase} vs ${after.samplesPerCase}); p95 is not directly comparable.`,
    );
  }
  return {
    origin: before.origin,
    locale: before.locale,
    beforeCapturedAt: before.capturedAt ?? null,
    afterCapturedAt: after.capturedAt ?? null,
    cases,
    warnings,
    regressions,
    passed: regressions.length === 0,
  };
}

function printReport(report) {
  console.log("Proti v0.7.0 — Search performance comparison");
  console.log(`Origin: ${report.origin}; locale: ${report.locale}`);
  console.log("Positive improvement % means faster; negative means slower.\n");
  console.log(
    `${"Scenario".padEnd(24)} ${"p50 before".padStart(11)} ${"p50 after".padStart(11)} ${"improvement".padStart(13)} ${"p95 before".padStart(11)} ${"p95 after".padStart(10)}`,
  );
  for (const item of report.cases) {
    const p50 = item.metrics.totalP50Ms;
    const p95 = item.metrics.totalP95Ms;
    const pct =
      p50.improvementPct === null
        ? "n/a"
        : `${p50.improvementPct > 0 ? "+" : ""}${p50.improvementPct}%`;
    console.log(
      `${item.name.padEnd(24)} ${`${p50.before}ms`.padStart(11)} ${`${p50.after}ms`.padStart(11)} ${pct.padStart(13)} ${`${p95.before}ms`.padStart(11)} ${`${p95.after}ms`.padStart(10)}`,
    );
  }
  for (const warning of report.warnings) console.warn(`WARNING: ${warning}`);
  for (const regression of report.regressions)
    console.error(`REGRESSION: ${regression}`);
  console.log(
    "Note: latency improvements do not prove result correctness; run search-contract-check.mjs and the regression suites.",
  );
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) return console.log(usage());
  const before = JSON.parse(readFileSync(flags.before, "utf8"));
  const after = JSON.parse(readFileSync(flags.after, "utf8"));
  const report = compareRuns(before, after, {
    maxP50RegressionPct: flags["max-p50-regression-pct"],
    minRegressionMs: flags["min-regression-ms"],
  });
  printReport(report);
  if (flags["json-out"]) {
    writeFileSync(
      flags["json-out"],
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    console.log(`Saved ${flags["json-out"]}`);
  }
  if (!report.passed) process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(`Search comparison failed: ${error.message}`);
    process.exitCode = 1;
  });
}
