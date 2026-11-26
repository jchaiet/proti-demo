import assert from "node:assert/strict";
import test from "node:test";
import { compareRuns, parseArgs } from "./search-performance-compare.mjs";

function run(ms = 280, bytes = 1637) {
  return {
    origin: "http://localhost:3000",
    locale: "site-default",
    samplesPerCase: 20,
    cases: [
      {
        name: "API basic query",
        path: "/api/search?q=first",
        statusCodes: [200],
        totalP50Ms: ms,
        totalP95Ms: ms + 20,
        ttfbP50Ms: ms - 1,
        ttfbP95Ms: ms + 19,
        responseBytesP50: bytes,
      },
    ],
  };
}

test("compares identical workloads and reports positive speedup", () => {
  const result = compareRuns(run(280), run(159));
  assert.equal(result.passed, true);
  assert.equal(result.cases[0].metrics.totalP50Ms.savedMs, 121);
  assert.equal(result.cases[0].metrics.totalP50Ms.improvementPct, 43.2);
});

test("rejects comparing different query paths or origins", () => {
  const differentPath = run(159);
  differentPath.cases[0].path = "/api/search?q=nutrition";
  assert.throws(() => compareRuns(run(), differentPath), /paths differ/);
  const differentHost = run(159);
  differentHost.origin = "https://elsewhere.example";
  assert.throws(() => compareRuns(run(), differentHost), /Origins differ/);
});

test("refuses HTTP error results as performance samples", () => {
  const broken = run(2);
  broken.cases[0].statusCodes = [404];
  assert.throws(() => compareRuns(run(), broken), /HTTP 200/);
});

test("warns on payload changes without assuming an API regression", () => {
  const result = compareRuns(run(280), run(159, 1599));
  assert.equal(result.passed, true);
  assert.match(result.warnings[0], /response size changed/);
});

test("optional regression gate detects large p50 increases", () => {
  const result = compareRuns(run(100), run(140), { maxP50RegressionPct: 20 });
  assert.equal(result.passed, false);
  assert.equal(result.regressions.length, 1);
  const small = compareRuns(run(100), run(110), { maxP50RegressionPct: 5 });
  assert.equal(small.passed, true); // < 15ms default noise floor
});

test("requires both input JSON paths", () => {
  assert.throws(() => parseArgs(["--before", "a.json"]), /required/);
  assert.deepEqual(
    parseArgs(["--before", "a.json", "--after", "b.json"]).before,
    "a.json",
  );
});
