/** Summarize Lighthouse CI JSON reports without introducing extra dependencies. */
export const PERF_ROUTES = ["hero", "grid", "navigation"];

const AUDITS = {
  lcpMs: "largest-contentful-paint",
  cls: "cumulative-layout-shift",
  tbtMs: "total-blocking-time",
  fcpMs: "first-contentful-paint",
};

function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round(number, places = 0) {
  return Number(number.toFixed(places));
}

export function summarizeLighthouseRuns(
  lhrs,
  { profile, runs, routes = PERF_ROUTES },
) {
  const grouped = new Map(routes.map((route) => [route, []]));

  for (const lhr of lhrs) {
    if (lhr.runtimeError) {
      throw new Error(
        `${profile}: Lighthouse runtime error: ${lhr.runtimeError.message}`,
      );
    }
    const url = lhr.requestedUrl || lhr.finalUrl;
    if (!url) throw new Error(`${profile}: report is missing a URL`);
    const match = new URL(url).pathname.match(
      /^\/visual-fixtures\/([^/]+)\/?$/,
    );
    const route = match?.[1];
    if (!grouped.has(route)) {
      throw new Error(`${profile}: unexpected Lighthouse route ${url}`);
    }
    if (!Number.isFinite(lhr.categories?.performance?.score)) {
      throw new Error(`${profile}/${route}: missing performance score`);
    }
    for (const [key, audit] of Object.entries(AUDITS)) {
      if (!Number.isFinite(lhr.audits?.[audit]?.numericValue)) {
        throw new Error(`${profile}/${route}: missing ${key} metric`);
      }
    }
    grouped.get(route).push(lhr);
  }

  return routes.map((route) => {
    const reports = grouped.get(route);
    if (reports.length !== runs) {
      throw new Error(
        `${profile}/${route}: expected ${runs} runs, received ${reports.length}`,
      );
    }
    const metric = (id) =>
      median(reports.map((lhr) => lhr.audits[AUDITS[id]].numericValue));
    return {
      profile,
      route,
      runs,
      score: round(
        median(reports.map((lhr) => lhr.categories.performance.score)) * 100,
      ),
      lcpMs: round(metric("lcpMs")),
      cls: round(metric("cls"), 3),
      tbtMs: round(metric("tbtMs")),
      fcpMs: round(metric("fcpMs")),
    };
  });
}

export function renderSummaryMarkdown(
  results,
  generatedAt,
  { failedProfiles = [] } = {},
) {
  return [
    "# Proti performance budgets — Lighthouse lab measurements",
    "",
    `Generated: ${generatedAt}`,
    "",
    "Each cell is the **median** of the Lighthouse runs for that route/profile.",
    "Desktop and mobile use different Lighthouse throttling and emulation.",
    "These are lab measurements, not real-user Core Web Vitals or INP.",
    "",
    "| Profile | Fixture | Runs | Score / 100 | LCP (ms) | CLS | TBT (ms) | FCP (ms) |",
    "|---|---|---:|---:|---:|---:|---:|---:|",
    ...results.map(
      (row) =>
        `| ${row.profile} | ${row.route} | ${row.runs} | ${row.score} | ${row.lcpMs} | ${row.cls.toFixed(3)} | ${row.tbtMs} | ${row.fcpMs} |`,
    ),
    "",
    "**Blocking budgets (median per fixture):** score ≥ 90, LCP ≤ 2500 ms, CLS ≤ 0.1.",
    "**Warning-only goal:** TBT ≤ 200 ms. A TBT warning does not fail CI.",
    failedProfiles.length
      ? `**FAIL:** Lighthouse blocking assertions failed for ${failedProfiles.join(", ")}.`
      : "**PASS:** Lighthouse blocking assertions passed for desktop and mobile.",
    "",
  ].join("\n");
}
