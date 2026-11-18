/**
 * Fast, offline environment preflight for Proti.
 *
 * Unlike `proti:check`, this never calls Sanity, touches Git, or writes files.
 * No secret values or user-supplied URLs are printed in diagnostics.
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";

const modes = new Set(["development", "production", "ci"]);
const targets = new Set(["all", "web", "studio"]);
const result = (level, name, detail) => ({ level, name, detail });
const present = (env, key) =>
  typeof env[key] === "string" && env[key].trim().length > 0;
const get = (env, key) => (typeof env[key] === "string" ? env[key].trim() : "");

export function parseOptions(args = []) {
  const options = { mode: "development", target: "all" };
  for (const arg of args) {
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg.startsWith("--mode=")) {
      const mode = arg.slice(7);
      options.mode = mode === "local" ? "development" : mode;
    } else if (arg.startsWith("--target=")) {
      options.target = arg.slice(9);
    } else {
      throw new Error(`Unknown argument: ${arg}. Use --help for usage.`);
    }
  }
  if (!modes.has(options.mode))
    throw new Error("--mode must be development, production, or ci.");
  if (!targets.has(options.target))
    throw new Error("--target must be all, web, or studio.");
  return options;
}

async function readEnvFile(file, issues, label) {
  try {
    return parseEnv(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    issues.push(
      result(
        "error",
        `${label} environment`,
        `Cannot parse/read ${path.basename(file)}; correct its dotenv syntax.`,
      ),
    );
    return {};
  }
}

/** Respect exported variables first, then Next/Sanity mode precedence. */
async function environmentFor({ root, target, mode, runtimeEnv, issues }) {
  const dir = path.join(root, target);
  const profiles =
    mode === "development"
      ? [".env", ".env.development", ".env.local", ".env.development.local"]
      : mode === "production"
        ? [".env", ".env.production", ".env.local", ".env.production.local"]
        : // CI must not silently use a developer's .env.local; Studio's tracked
          // .env.production supplies its Presentation URL when not exported.
          target === "studio"
          ? [".env.production"]
          : [];
  const merged = {};
  for (const filename of profiles) {
    Object.assign(
      merged,
      await readEnvFile(path.join(dir, filename), issues, target),
    );
  }
  return { ...merged, ...runtimeEnv };
}

function validateId(env, key, kind, issues) {
  const value = get(env, key);
  if (!value) {
    issues.push(
      result(
        "error",
        key,
        `Missing. Set ${key} in the application environment or run pnpm proti:init for a new site.`,
      ),
    );
  } else if (
    !(kind === "project" ? /^[a-z0-9-]{3,64}$/ : /^[a-z0-9_-]{1,64}$/).test(
      value,
    )
  ) {
    issues.push(
      result("error", key, `Invalid ${kind} identifier; check ${key}.`),
    );
  } else {
    issues.push(result("pass", key, "Configured."));
  }
}

function originStatus(raw, { publicHttps = false } = {}) {
  try {
    const u = new URL(raw);
    if (
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      u.pathname !== "/" ||
      !["https:", "http:"].includes(u.protocol)
    )
      return false;
    if (
      publicHttps &&
      (u.protocol !== "https:" ||
        ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname.toLowerCase()))
    )
      return false;
    // HTTP only makes sense for local development. All remote origins use HTTPS.
    if (
      u.protocol === "http:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname.toLowerCase())
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

function checkOrigin(env, key, issues, { publicHttps = false } = {}) {
  if (!present(env, key)) {
    issues.push(
      result(
        "error",
        key,
        `Missing. Configure ${key} with a ${publicHttps ? "public HTTPS" : "HTTP localhost or HTTPS"} origin.`,
      ),
    );
  } else if (!originStatus(get(env, key), { publicHttps })) {
    issues.push(
      result(
        "error",
        key,
        `Invalid. Use a ${publicHttps ? "public HTTPS" : "localhost HTTP or HTTPS"} origin without credentials, path, query, or fragment.`,
      ),
    );
  } else {
    issues.push(result("pass", key, "Configured."));
  }
}

function compareConfig(actual, expected, key, issues) {
  if (
    typeof expected === "string" &&
    expected.trim() &&
    actual &&
    actual !== expected
  ) {
    issues.push(
      result(
        "error",
        key,
        `Does not match sanity settings in proti.config.json. Update ${key} or the project configuration.`,
      ),
    );
  }
}

async function loadConfig(root, mode, issues) {
  let raw;
  try {
    raw = await fs.readFile(path.join(root, "proti.config.json"), "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      issues.push(
        result(
          "error",
          "Project configuration",
          "Unable to read proti.config.json.",
        ),
      );
    } else if (mode === "development") {
      issues.push(
        result(
          "error",
          "Project configuration",
          "Missing proti.config.json. Run pnpm proti:init --new-project in a fresh independent clone; do not initialize the maintained source repository.",
        ),
      );
    } else {
      issues.push(
        result(
          "warn",
          "Project configuration",
          "proti.config.json is absent; validating deployed environment values only.",
        ),
      );
    }
    return null;
  }
  try {
    const config = JSON.parse(raw);
    if (
      !config ||
      typeof config !== "object" ||
      !config.sanity ||
      typeof config.sanity !== "object"
    ) {
      throw new Error("invalid config shape");
    }
    issues.push(result("pass", "Project configuration", "Readable."));
    return config;
  } catch {
    issues.push(
      result(
        "error",
        "Project configuration",
        "Invalid proti.config.json; expected JSON with a sanity object.",
      ),
    );
    return null;
  }
}

export async function checkEnvironment({
  root = process.cwd(),
  mode = "development",
  target = "all",
  runtimeEnv = process.env,
} = {}) {
  if (!modes.has(mode) || !targets.has(target))
    throw new Error("Invalid preflight mode or target.");
  const issues = [];
  const config = await loadConfig(root, mode, issues);
  const checkWeb = target === "all" || target === "web";
  const checkStudio = target === "all" || target === "studio";
  let web;
  let studio;

  if (checkWeb) {
    web = await environmentFor({
      root,
      target: "web",
      mode,
      runtimeEnv,
      issues,
    });
    validateId(web, "NEXT_SANITY_PROJECT_ID", "project", issues);
    validateId(web, "NEXT_SANITY_DATASET", "dataset", issues);
    checkOrigin(web, "NEXT_SANITY_STUDIO_URL", issues, {
      publicHttps: mode === "production",
    });
    compareConfig(
      get(web, "NEXT_SANITY_PROJECT_ID"),
      config?.sanity?.projectId,
      "NEXT_SANITY_PROJECT_ID",
      issues,
    );
    compareConfig(
      get(web, "NEXT_SANITY_DATASET"),
      config?.sanity?.dataset,
      "NEXT_SANITY_DATASET",
      issues,
    );
    compareConfig(
      get(web, "NEXT_SANITY_STUDIO_URL"),
      config?.sanity?.studioUrl,
      "NEXT_SANITY_STUDIO_URL",
      issues,
    );

    for (const [key, feature] of [
      ["SANITY_API_READ_TOKEN", "Draft Mode and private reads"],
      ["SANITY_API_WRITE_TOKEN", "Poll voting and content writes"],
      ["SANITY_REVALIDATE_SECRET", "signed revalidation webhooks"],
    ]) {
      if (!present(web, key))
        issues.push(
          result(
            "warn",
            key,
            `Not configured; ${feature} require this server-side secret.`,
          ),
        );
    }
    for (const key of Object.keys(web)) {
      if (
        /^NEXT_PUBLIC_.*(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY)/i.test(key) &&
        present(web, key)
      ) {
        issues.push(
          result(
            "error",
            "Public secret exposure",
            `Remove ${key}; secrets must never use NEXT_PUBLIC_.`,
          ),
        );
      }
    }
    if (get(web, "PROTI_VISUAL_FIXTURES") === "1") {
      issues.push(
        result(
          mode === "production" ? "error" : "warn",
          "Visual fixtures",
          mode === "production"
            ? "PROTI_VISUAL_FIXTURES=1 must not be deployed publicly."
            : "Fixture routes are enabled; use only for local/CI testing.",
        ),
      );
    }
  }

  if (checkStudio) {
    studio = await environmentFor({
      root,
      target: "studio",
      mode,
      runtimeEnv,
      issues,
    });
    validateId(studio, "SANITY_STUDIO_PROJECT_ID", "project", issues);
    validateId(studio, "SANITY_STUDIO_DATASET", "dataset", issues);
    if (!present(studio, "SANITY_STUDIO_TITLE"))
      issues.push(
        result(
          "warn",
          "SANITY_STUDIO_TITLE",
          "Not set; Studio will use its default title.",
        ),
      );
    checkOrigin(studio, "SANITY_STUDIO_PREVIEW_URL", issues, {
      publicHttps: mode !== "development",
    });
    compareConfig(
      get(studio, "SANITY_STUDIO_PROJECT_ID"),
      config?.sanity?.projectId,
      "SANITY_STUDIO_PROJECT_ID",
      issues,
    );
    compareConfig(
      get(studio, "SANITY_STUDIO_DATASET"),
      config?.sanity?.dataset,
      "SANITY_STUDIO_DATASET",
      issues,
    );
    const previewKey =
      mode === "development" ? "previewUrl" : "productionPreviewUrl";
    compareConfig(
      get(studio, "SANITY_STUDIO_PREVIEW_URL"),
      config?.sanity?.[previewKey],
      "SANITY_STUDIO_PREVIEW_URL",
      issues,
    );
    if (mode !== "ci") {
      const localEnv = await readEnvFile(
        path.join(root, "studio", ".env.local"),
        issues,
        "studio",
      );
      if (present(localEnv, "SANITY_STUDIO_PREVIEW_URL")) {
        issues.push(
          result(
            "error",
            "Studio environment",
            "Remove SANITY_STUDIO_PREVIEW_URL from studio/.env.local; configure it in .env.development and .env.production.",
          ),
        );
      }
    }
  }
  if (
    checkWeb &&
    checkStudio &&
    present(web, "NEXT_SANITY_PROJECT_ID") &&
    present(studio, "SANITY_STUDIO_PROJECT_ID") &&
    web.NEXT_SANITY_PROJECT_ID !== studio.SANITY_STUDIO_PROJECT_ID
  ) {
    issues.push(
      result(
        "error",
        "Sanity consistency",
        "Web and Studio project IDs differ.",
      ),
    );
  }
  if (
    checkWeb &&
    checkStudio &&
    present(web, "NEXT_SANITY_DATASET") &&
    present(studio, "SANITY_STUDIO_DATASET") &&
    web.NEXT_SANITY_DATASET !== studio.SANITY_STUDIO_DATASET
  ) {
    issues.push(
      result("error", "Sanity consistency", "Web and Studio datasets differ."),
    );
  }
  return issues;
}

export function formatReport(issues, { mode, target }) {
  const icon = { pass: "✓", warn: "!", error: "✗" };
  const rows = [`Proti environment preflight — ${target} / ${mode}`, ""];
  for (const { level, name, detail } of issues)
    rows.push(`${icon[level]} ${name} — ${detail}`);
  const errors = issues.filter((item) => item.level === "error").length;
  const warnings = issues.filter((item) => item.level === "warn").length;
  rows.push(
    "",
    `${errors} error(s), ${warnings} warning(s). ${errors ? "Fix errors before building." : "Environment preflight passed."}`,
  );
  rows.push(
    "For live Sanity connectivity and Forms/Polls readiness, run pnpm proti:check.",
  );
  return { message: rows.join("\n"), errors, warnings };
}

async function main() {
  let options;
  try {
    options = parseOptions(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    console.log(
      "Usage: pnpm proti:env:check [--target=all|web|studio] [--mode=development|production|ci]\nNo network requests or file writes. Run from the repo root.\nDefault: --target=all --mode=development.\nFor CI, use --mode=ci (only exported variables; Studio may use tracked .env.production).\nFor Vercel Web, use --target=web --mode=production with exported deployment variables.",
    );
    return;
  }
  const issues = await checkEnvironment(options);
  const output = formatReport(issues, options);
  console.log(output.message);
  if (output.errors) process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}
