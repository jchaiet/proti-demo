/**
 * Proti v0.6.0 — enforced Lighthouse CI budgets (Batch 3).
 * Three Lighthouse runs per fixture are aggregated with the median.
 * TBT remains a warning because mobile CI timing is noisy.
 */
const profile = process.env.PROTI_PERF_PROFILE || "mobile";
if (!["desktop", "mobile"].includes(profile)) {
  throw new Error(`Invalid PROTI_PERF_PROFILE: ${profile}`);
}

const port = Number(process.env.PROTI_PERF_PORT || 3000);
const numberOfRuns = Number(process.env.PROTI_PERF_RUNS || 3);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PROTI_PERF_PORT must be a valid TCP port");
}
if (!Number.isInteger(numberOfRuns) || numberOfRuns < 1 || numberOfRuns > 10) {
  throw new Error("PROTI_PERF_RUNS must be between 1 and 10");
}

module.exports = {
  ci: {
    collect: {
      url: ["hero", "grid", "navigation"].map(
        (route) => `http://127.0.0.1:${port}/visual-fixtures/${route}`,
      ),
      numberOfRuns,
      settings: {
        onlyCategories: ["performance"],
        // Desktop preset or default Lighthouse mobile emulation/throttling.
        ...(profile === "desktop" ? { preset: "desktop" } : {}),
      },
    },
    assert: {
      assertions: {
        "categories:performance": [
          "error",
          { minScore: 0.9, aggregationMethod: "median" },
        ],
        "largest-contentful-paint": [
          "error",
          { maxNumericValue: 2500, aggregationMethod: "median" },
        ],
        "cumulative-layout-shift": [
          "error",
          { maxNumericValue: 0.1, aggregationMethod: "median" },
        ],
        "total-blocking-time": [
          "warn",
          { maxNumericValue: 200, aggregationMethod: "median" },
        ],
      },
    },
    // Reports are copied into test-results/performance and uploaded by CI.
    // Do not publish Lighthouse reports to a separate external LHCI server.
  },
};
