import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const configFile = require.resolve("../.lighthouserc.cjs");

function configFor(profile) {
  const originalProfile = process.env.PROTI_PERF_PROFILE;
  const originalPort = process.env.PROTI_PERF_PORT;
  const originalRuns = process.env.PROTI_PERF_RUNS;
  try {
    process.env.PROTI_PERF_PROFILE = profile;
    process.env.PROTI_PERF_PORT = "3100";
    process.env.PROTI_PERF_RUNS = "3";
    delete require.cache[configFile];
    return require(configFile);
  } finally {
    if (originalProfile === undefined) delete process.env.PROTI_PERF_PROFILE;
    else process.env.PROTI_PERF_PROFILE = originalProfile;
    if (originalPort === undefined) delete process.env.PROTI_PERF_PORT;
    else process.env.PROTI_PERF_PORT = originalPort;
    if (originalRuns === undefined) delete process.env.PROTI_PERF_RUNS;
    else process.env.PROTI_PERF_RUNS = originalRuns;
    delete require.cache[configFile];
  }
}

test("desktop uses the desktop preset and deterministic fixture URLs", () => {
  const config = configFor("desktop");
  assert.equal(config.ci.collect.settings.preset, "desktop");
  assert.equal(config.ci.collect.numberOfRuns, 3);
  assert.deepEqual(
    Object.values(config.ci.assert.assertions).map(([level]) => level),
    ["error", "error", "error", "warn"],
  );
  assert.deepEqual(config.ci.collect.url, [
    "http://127.0.0.1:3100/visual-fixtures/hero",
    "http://127.0.0.1:3100/visual-fixtures/grid",
    "http://127.0.0.1:3100/visual-fixtures/navigation",
  ]);
});

test("mobile uses Lighthouse emulation; blocking metrics are errors and TBT is warning-only", () => {
  const config = configFor("mobile");
  assert.equal(config.ci.collect.settings.preset, undefined);
  assert.equal(config.ci.upload, undefined);
  assert.deepEqual(
    Object.values(config.ci.assert.assertions).map(([level]) => level),
    ["error", "error", "error", "warn"],
  );
  for (const [name, [level, limits]] of Object.entries(
    config.ci.assert.assertions,
  )) {
    assert.equal(limits.aggregationMethod, "median", name);
    if (name !== "total-blocking-time") assert.equal(level, "error", name);
  }
  assert.equal(
    config.ci.assert.assertions["categories:performance"][1].minScore,
    0.9,
  );
  assert.equal(
    config.ci.assert.assertions["largest-contentful-paint"][1].maxNumericValue,
    2500,
  );
  assert.equal(
    config.ci.assert.assertions["cumulative-layout-shift"][1].maxNumericValue,
    0.1,
  );
  assert.equal(
    config.ci.assert.assertions["total-blocking-time"][1].maxNumericValue,
    200,
  );
});

test("invalid performance profile is rejected", () => {
  assert.throws(() => configFor("tablet"), /Invalid PROTI_PERF_PROFILE/);
});
