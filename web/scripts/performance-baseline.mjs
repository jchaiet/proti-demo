#!/usr/bin/env node
/**
 * Collect local desktop + mobile Lighthouse CI baselines from the production
 * Next.js server, using deterministic CMS-independent visual fixtures.
 * Requires: a production build, Chrome/Chromium, and `@lhci/cli`.
 */
import { spawn, spawnSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  PERF_ROUTES,
  renderSummaryMarkdown,
  summarizeLighthouseRuns,
} from "./performance-summary.mjs";

const cwd = process.cwd();
const port = Number(process.env.PROTI_PERF_PORT || 3000);
const runs = Number(process.env.PROTI_PERF_RUNS || 3);
const origin = `http://127.0.0.1:${port}`;
const reportDirectory = resolve(cwd, "test-results/performance");
const lhciDirectory = resolve(cwd, ".lighthouseci");
let server;

function exitMessage(message) {
  throw new Error(message);
}

async function assertPortFree() {
  await new Promise((done, reject) => {
    const check = createServer();
    check.once("error", () =>
      reject(
        new Error(
          `Port ${port} is in use. Stop the existing server or set PROTI_PERF_PORT.`,
        ),
      ),
    );
    check.listen(port, "127.0.0.1", () => check.close(done));
  });
}

async function waitForHealth() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      exitMessage(`Next.js exited unexpectedly (${server.exitCode})`);
    try {
      const response = await fetch(`${origin}/api/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) return;
    } catch {
      /* startup not ready yet */
    }
    await delay(500);
  }
  exitMessage(
    "Next.js was not ready within 90 seconds; see server output above.",
  );
}

async function checkFixtures() {
  for (const route of PERF_ROUTES) {
    const response = await fetch(`${origin}/visual-fixtures/${route}`, {
      signal: AbortSignal.timeout(15000),
    });
    const html = await response.text();
    if (
      response.status !== 200 ||
      !html.includes(`data-visual-fixture="${route}"`)
    ) {
      exitMessage(
        `Fixture /visual-fixtures/${route} is not ready (HTTP ${response.status}). ` +
          "Check that you built with PROTI_VISUAL_FIXTURES=1.",
      );
    }
  }
}

async function runCommand(args, env, { allowFailure = false } = {}) {
  const child = spawn(
    "pnpm",
    ["exec", "lhci", ...args, "--config=.lighthouserc.cjs"],
    {
      cwd,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );
  const code = await new Promise((done, reject) => {
    child.once("error", reject);
    child.once("exit", (status, signal) => done(signal ? 1 : status));
  });
  if (code !== 0 && !allowFailure) {
    exitMessage(
      `Lighthouse CI ${args[0]} failed for ${env.PROTI_PERF_PROFILE} (exit ${code}).`,
    );
  }
  return code;
}

async function readReports() {
  const filenames = (await readdir(lhciDirectory)).filter((name) =>
    /^lhr-.*\.json$/.test(name),
  );
  if (filenames.length === 0)
    exitMessage("No Lighthouse report JSON files found.");
  return Promise.all(
    filenames.map(async (name) =>
      JSON.parse(await readFile(resolve(lhciDirectory, name), "utf8")),
    ),
  );
}

function stopServer() {
  if (!server?.pid) return;
  try {
    // pnpm and Next.js are in a dedicated Unix process group, avoiding orphans.
    if (process.platform !== "win32") process.kill(-server.pid, "SIGTERM");
    else server.kill("SIGTERM");
  } catch {
    /* already stopped */
  }
}

process.once("SIGINT", () => {
  stopServer();
  process.exit(130);
});
process.once("SIGTERM", () => {
  stopServer();
  process.exit(143);
});

try {
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !Number.isInteger(runs) ||
    runs < 1 ||
    runs > 10
  ) {
    exitMessage(
      "PROTI_PERF_PORT must be 1–65535; PROTI_PERF_RUNS must be 1–10.",
    );
  }
  if (process.env.CI === "true" && runs !== 3) {
    exitMessage(
      "CI performance budgets require exactly 3 Lighthouse runs per fixture.",
    );
  }
  await readFile(resolve(cwd, ".next/BUILD_ID"));
  if (
    spawnSync("pnpm", ["exec", "lhci", "--version"], { cwd, stdio: "ignore" })
      .status !== 0
  ) {
    exitMessage(
      "Missing Lighthouse CI. Run `pnpm install` in the workspace first.",
    );
  }
  await assertPortFree();
  await rm(reportDirectory, { recursive: true, force: true });
  await mkdir(reportDirectory, { recursive: true });

  console.log(
    `Starting production Next.js at ${origin} with local visual fixtures enabled.`,
  );
  server = spawn(
    "pnpm",
    ["exec", "next", "start", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd,
      env: {
        ...process.env,
        PROTI_VISUAL_FIXTURES: "1",
        NODE_ENV: "production",
      },
      stdio: "inherit",
      detached: process.platform !== "win32",
      shell: process.platform === "win32",
    },
  );
  await waitForHealth();
  await checkFixtures();

  const results = [];
  const failedProfiles = [];
  for (const profile of ["desktop", "mobile"]) {
    console.log(`\nCollecting ${runs} Lighthouse runs per fixture: ${profile}`);
    // LHCI resets this directory between separate collect calls.
    await rm(lhciDirectory, { recursive: true, force: true });
    const env = {
      ...process.env,
      PROTI_PERF_PROFILE: profile,
      PROTI_PERF_PORT: String(port),
      PROTI_PERF_RUNS: String(runs),
    };

    try {
      await runCommand(["collect"], env);
      results.push(
        ...summarizeLighthouseRuns(await readReports(), { profile, runs }),
      );
      // LHCI's median assertions enforce score, LCP, and CLS. TBT only warns.
      // Do not exit immediately: CI must retain both profiles' reports.
      const status = await runCommand(["assert"], env, { allowFailure: true });
      if (status !== 0) {
        failedProfiles.push(profile);
        console.error(
          `Blocking Lighthouse budgets failed for ${profile} (exit ${status}).`,
        );
      }
    } finally {
      // Keep raw LHRs even on an assertion failure or malformed report.
      try {
        await cp(lhciDirectory, resolve(reportDirectory, profile), {
          recursive: true,
        });
      } catch (error) {
        console.error(
          `Could not preserve ${profile} Lighthouse reports: ${error.message}`,
        );
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const summary = { generatedAt, runsPerRoute: runs, results, failedProfiles };
  await writeFile(
    resolve(reportDirectory, "summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  const markdown = renderSummaryMarkdown(results, generatedAt, {
    failedProfiles,
  });
  await writeFile(resolve(reportDirectory, "summary.md"), markdown);
  console.log(`\n${markdown}`);
  console.log("Lighthouse reports: test-results/performance/{desktop,mobile}/");
  if (failedProfiles.length) {
    console.error(`Performance budgets failed: ${failedProfiles.join(", ")}.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Performance baseline failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  stopServer();
}
