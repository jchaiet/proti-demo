import assert from "node:assert/strict";
import test from "node:test";
import {
  renderSummaryMarkdown,
  summarizeLighthouseRuns,
} from "./performance-summary.mjs";

function makeLhr(
  route,
  { score = 0.9, lcp = 2500, cls = 0.05, tbt = 120, fcp = 1100 } = {},
) {
  return {
    requestedUrl: `http://127.0.0.1:3000/visual-fixtures/${route}`,
    categories: { performance: { score } },
    audits: {
      "largest-contentful-paint": { numericValue: lcp },
      "cumulative-layout-shift": { numericValue: cls },
      "total-blocking-time": { numericValue: tbt },
      "first-contentful-paint": { numericValue: fcp },
    },
  };
}

test("summarizes the median of three runs for each fixture", () => {
  const reports = ["hero", "grid", "navigation"].flatMap((route) => [
    makeLhr(route, { score: 0.7, lcp: 3500, cls: 0.09 }),
    makeLhr(route, { score: 0.92, lcp: 2000, cls: 0.01 }),
    makeLhr(route, { score: 0.87, lcp: 2400, cls: 0.05 }),
  ]);
  const summary = summarizeLighthouseRuns(reports, {
    profile: "mobile",
    runs: 3,
  });
  assert.equal(summary.length, 3);
  for (const row of summary) {
    assert.equal(row.score, 87);
    assert.equal(row.lcpMs, 2400);
    assert.equal(row.cls, 0.05);
    assert.equal(row.runs, 3);
  }
  assert.match(
    renderSummaryMarkdown(summary, "2026-11-15"),
    /\| mobile \| hero \| 3 \| 87 \| 2400 \|/,
  );
});

test("throws when a fixture has fewer than the configured number of runs", () => {
  assert.throws(
    () =>
      summarizeLighthouseRuns([makeLhr("hero")], {
        profile: "mobile",
        runs: 3,
      }),
    /expected 3 runs, received 1/,
  );
});

test("throws on unexpected routes, missing metrics, and Lighthouse runtime errors", () => {
  const options = { profile: "desktop", runs: 1, routes: ["hero"] };
  assert.throws(
    () => summarizeLighthouseRuns([makeLhr("wrong")], options),
    /unexpected Lighthouse route/,
  );
  const missing = makeLhr("hero");
  delete missing.audits["total-blocking-time"];
  assert.throws(
    () => summarizeLighthouseRuns([missing], options),
    /missing tbtMs metric/,
  );
  const broken = {
    ...makeLhr("hero"),
    runtimeError: { message: "Chrome failed" },
  };
  assert.throws(
    () => summarizeLighthouseRuns([broken], options),
    /Chrome failed/,
  );
});

test("records a Lighthouse budget failure in the Markdown summary", () => {
  const rows = [
    {
      profile: "mobile",
      route: "grid",
      runs: 3,
      score: 96,
      lcpMs: 1209,
      cls: 0,
      tbtMs: 211,
      fcpMs: 1209,
    },
  ];
  const passing = renderSummaryMarkdown(rows, "2026-11-16");
  assert.match(passing, /Warning-only goal.*TBT ≤ 200 ms/);
  assert.match(passing, /PASS.*desktop and mobile/);
  const failing = renderSummaryMarkdown(rows, "2026-11-16", {
    failedProfiles: ["mobile"],
  });
  assert.match(failing, /FAIL.*mobile/);
  assert.doesNotMatch(failing, /PASS.*desktop and mobile/);
});
