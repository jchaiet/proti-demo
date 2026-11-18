#!/usr/bin/env node

/**
 * Developer-only verification shortcuts. This never changes deployed content,
 * updates snapshots, or mutates the caller's environment.
 * Existing package scripts and CI jobs remain the source of truth.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_ENV = Object.freeze({ PROTI_VISUAL_FIXTURES: "1" });

const visualSpecs = [
  "e2e/visual-fixtures.spec.ts",
  "e2e/visual-content.spec.ts",
  "e2e/visual-grid-cards.spec.ts",
  "e2e/visual-accordion.spec.ts",
  "e2e/visual-tabs-carousel.spec.ts",
  "e2e/visual-navigation.spec.ts",
];
const browserProjects = [
  "--project=chromium-desktop",
  "--project=chromium-mobile",
];

function step(label, args, env = {}) {
  return { label, args, env };
}

const quick = [
  step("Offline environment preflight", ["proti:env:check"]),
  step("Proti initializer and tooling tests", ["test:proti"]),
  step("Web lint", ["--dir", "web", "lint"]),
  step("Web typecheck", ["--dir", "web", "typecheck"]),
  step("Web unit tests", ["--dir", "web", "test:run"]),
  step("Studio unit tests", ["--dir", "studio", "test"]),
  step("Lighthouse runner unit tests", [
    "--dir",
    "web",
    "test:performance:unit",
  ]),
];
const fixtureBuild = step(
  "Build fixture-enabled Web",
  ["--dir", "web", "build"],
  FIXTURE_ENV,
);
const fixtureTests = step(
  "Chromium fixture visuals, accessibility, and Grid image layout",
  [
    "--dir",
    "web",
    "exec",
    "playwright",
    "test",
    ...visualSpecs,
    "e2e/a11y-fixtures.spec.ts",
    "e2e/grid-image-layout.spec.ts",
    ...browserProjects,
  ],
  FIXTURE_ENV,
);
const performanceTests = step(
  "Lighthouse desktop/mobile budgets",
  ["--dir", "web", "test:performance"],
  FIXTURE_ENV,
);

/** Returns a fresh plan. `all` reuses a single fixture build for both browser suites. */
export function createPlan(preset) {
  const plans = {
    quick,
    fixtures: [fixtureBuild, fixtureTests],
    performance: [fixtureBuild, performanceTests],
    all: [...quick, fixtureBuild, fixtureTests, performanceTests],
  };
  if (!Object.hasOwn(plans, preset)) {
    throw new Error(
      `Unknown verification preset "${preset}". Choose quick, fixtures, performance, or all.`,
    );
  }
  return plans[preset].map(({ label, args, env }) => ({
    label,
    args: [...args],
    env: { ...env },
  }));
}

export function formatStep(entry) {
  const envPrefix = Object.entries(entry.env)
    .map(([key, value]) => `${key}=${value} `)
    .join("");
  return `${envPrefix}pnpm ${entry.args.join(" ")}`;
}

/** Injectable spawn for fast, offline tests. Nonzero child status stops the plan. */
export function runPlan(
  plan,
  {
    spawn = spawnSync,
    environment = process.env,
    log = console.log,
    error = console.error,
    platform = process.platform,
  } = {},
) {
  const command = platform === "win32" ? "pnpm.cmd" : "pnpm";
  for (const [index, entry] of plan.entries()) {
    log(
      `\n[${index + 1}/${plan.length}] ${entry.label}\n> ${formatStep(entry)}`,
    );
    const result = spawn(command, entry.args, {
      cwd: root,
      stdio: "inherit",
      env: { ...environment, ...entry.env },
    });
    if (result.error) {
      error(`Unable to run pnpm: ${result.error.message}`);
      return 1;
    }
    if (result.status !== 0) {
      error(`\nVerification stopped at: ${entry.label}`);
      return Number.isInteger(result.status) && result.status > 0
        ? result.status
        : 1;
    }
  }
  log(`\nVerification complete: ${plan.length} step(s) passed.`);
  return 0;
}

const help = `Proti developer verification (run from repository root)

  pnpm verify:quick         Offline env check, root/Web/Studio tests, lint, typecheck
  pnpm verify:fixtures      Fixture build + Chromium visual, a11y, Grid layout checks
  pnpm verify:performance   Fixture build + desktop/mobile Lighthouse budgets
  pnpm verify:all           Quick + one fixture build + browser checks + Lighthouse
  pnpm proti:commands      Display this reference

  Append --dry-run to preview steps without running them.
  Existing pnpm build:web, build:studio, dev:web, dev:studio, and CI commands are unchanged.
  Fixture presets intentionally build with PROTI_VISUAL_FIXTURES=1; never deploy that build.
`;

export function main(
  argv = process.argv.slice(2),
  io = { log: console.log, error: console.error },
) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("--list")) {
    io.log(help);
    return 0;
  }
  const preset = argv[0];
  const flags = argv.slice(1);
  if (flags.some((flag) => flag !== "--dry-run")) {
    io.error(
      `Unknown option: ${flags.filter((flag) => flag !== "--dry-run").join(", ")}\n${help}`,
    );
    return 2;
  }
  let plan;
  try {
    plan = createPlan(preset);
  } catch (e) {
    io.error(`${e.message}\n${help}`);
    return 2;
  }
  if (flags.includes("--dry-run")) {
    io.log(`Proti verification: ${preset} (${plan.length} steps, dry-run)\n`);
    plan.forEach((entry, index) =>
      io.log(`${index + 1}. ${entry.label}\n   ${formatStep(entry)}`),
    );
    return 0;
  }
  return runPlan(plan, io);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main();
}
