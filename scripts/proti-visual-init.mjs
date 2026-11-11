import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  VISUAL_FIXTURE_SPECS,
  visualBaselinePaths,
} from "./proti-visual-fixtures.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT_DIR = path.join(ROOT, "web", "e2e", "__screenshots__");
// Default to the usual local website port, while allowing isolated test runs
// (or developers with multiple projects) to select another available port.
const configuredPort = process.env.PROTI_VISUAL_PORT?.trim() || "3000";
if (!/^\d+$/.test(configuredPort)) {
  throw new Error("PROTI_VISUAL_PORT must be an integer between 1 and 65535.");
}
const PORT = Number(configuredPort);
if (!Number.isSafeInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PROTI_VISUAL_PORT must be an integer between 1 and 65535.");
}
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const args = process.argv.slice(2);
const force = args.includes("--force");

if (args.some((arg) => arg !== "--force")) {
  console.error("Usage: pnpm proti:visual:init [--force]");
  process.exit(1);
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function hasScreenshots(directory) {
  if (!(await exists(directory))) return false;

  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
      return true;
    if (
      entry.isDirectory() &&
      (await hasScreenshots(path.join(directory, entry.name)))
    ) {
      return true;
    }
  }
  return false;
}

async function ensurePortAvailable() {
  const server = net.createServer();

  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(PORT, "0.0.0.0", resolve);
    });
  } catch (error) {
    throw new Error(
      `Port ${PORT} is occupied. Stop other Next.js servers before running visual initialization. (${error.message})`,
    );
  } finally {
    if (server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

function run(args, additionalEnv = {}) {
  const result = spawnSync(PNPM, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...additionalEnv },
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Command failed with exit code ${result.status}: pnpm ${args.join(" ")}`,
    );
  }
}

console.log("\nProti visual baseline initialization\n");

if (!(await exists(path.join(ROOT, "proti.config.json")))) {
  throw new Error("Project is not configured. Run pnpm proti:init first.");
}
if (!(await exists(path.join(ROOT, "web", ".env.local")))) {
  throw new Error(
    "Missing web/.env.local. Configure the project before generating baselines.",
  );
}

if ((await hasScreenshots(SNAPSHOT_DIR)) && !force) {
  throw new Error(
    "Visual baselines already exist. To intentionally replace them, run pnpm proti:visual:init --force.",
  );
}

await ensurePortAvailable();
console.log("Building Next.js with deterministic fixture routes enabled...");
run(["--filter", "./web", "build"], { PROTI_VISUAL_FIXTURES: "1" });

// Recheck because other local dev servers could start during the build.
await ensurePortAvailable();
console.log(
  "Generating deterministic Chromium desktop and mobile baselines...",
);
run(
  [
    "--filter",
    "./web",
    "exec",
    "playwright",
    "test",
    ...VISUAL_FIXTURE_SPECS,
    "--project=chromium-desktop",
    "--project=chromium-mobile",
    "--update-snapshots",
  ],
  {
    // Match the CI visual job. Fixture routes do not depend on the hostname.
    PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${PORT}`,
    PLAYWRIGHT_WEB_SERVER_COMMAND: `pnpm exec next start -p ${PORT} -H 127.0.0.1`,
    PLAYWRIGHT_SKIP_WEBSERVER: "0",
    PROTI_VISUAL_FIXTURES: "1",
  },
);

// Playwright can exit successfully even when screenshots were skipped.
// Require every approved fixture screenshot, including interactive states.
const missingBaselines = [];
for (const relative of visualBaselinePaths()) {
  if (!(await exists(path.join(ROOT, relative)))) {
    missingBaselines.push(relative);
  }
}
if (missingBaselines.length > 0) {
  throw new Error(
    `Playwright completed, but ${missingBaselines.length} required fixture baseline(s) are missing:\n${missingBaselines.join("\n")}.`,
  );
}

console.log("\n✓ Deterministic fixture visual baselines generated.");
console.log("Review web/e2e/__screenshots__, then commit the new screenshots.");
console.log(
  "CI should compare against these snapshots; it should never update them automatically.\n",
);
