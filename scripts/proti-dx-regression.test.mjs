/**
 * DX onboarding acceptance tests. All project initialization occurs in an
 * isolated OS temp directory; no Sanity or pnpm network access is required.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  copyScript,
  createTempRepo,
  removeTempRepo,
  runNode,
  scriptedInput,
} from "./test-helpers.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// Ensure a developer's exported credentials cannot influence our fake site.
// Removing the keys (rather than exporting empty strings) allows the normal
// local dotenv precedence to be exercised.
const isolatedEnv = Object.fromEntries(
  [
    "NEXT_SANITY_PROJECT_ID",
    "NEXT_SANITY_DATASET",
    "NEXT_SANITY_STUDIO_URL",
    "SANITY_STUDIO_PROJECT_ID",
    "SANITY_STUDIO_DATASET",
    "SANITY_STUDIO_PREVIEW_URL",
    "SANITY_API_READ_TOKEN",
    "SANITY_API_WRITE_TOKEN",
    "SANITY_REVALIDATE_SECRET",
    "PROTI_VISUAL_FIXTURES",
  ].map((name) => [name, undefined]),
);

const answers = scriptedInput([
  "DX Client", // project name
  "dx-client", // package slug
  "dx12345", // Sanity project ID
  "production", // dataset
  "http://localhost:3333", // Studio URL
  "", // development Presentation origin
  "", // initial Site name
  "", // Site key
  "localhost", // Site domains
  "", // canonical hostname
  "", // production Presentation origin (optional)
  "", // default locale
  "", // supported locales
]);

async function withInitializedSite(callback) {
  const repo = await createTempRepo();
  try {
    for (const file of [
      "proti-init.mjs",
      "proti-env-check.mjs",
      "proti-verify.mjs",
    ]) {
      await copyScript(path.join(here, file), repo, file);
    }
    const initialization = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: answers,
      env: isolatedEnv,
    });
    assert.equal(initialization.code, 0, initialization.stderr);
    await callback(repo, initialization);
  } finally {
    await removeTempRepo(repo);
  }
}

function git(repo, ...args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}

const preflight = (repo, args = [], env = {}) =>
  runNode({
    cwd: repo,
    script: "scripts/proti-env-check.mjs",
    args,
    env: { ...isolatedEnv, ...env },
  });

test("fresh independent initialization produces Web and Studio config that passes offline preflight", async () => {
  await withInitializedSite(async (repo) => {
    const config = JSON.parse(
      await fs.readFile(path.join(repo, "proti.config.json"), "utf8"),
    );
    assert.equal(config.projectName, "DX Client");
    assert.equal(config.sanity.projectId, "dx12345");
    assert.deepEqual(config.site.domains, ["localhost"]);
    assert.equal(
      git(repo, "config", "--local", "--get", "proti.initialized"),
      "true",
    );
    assert.equal(
      git(repo, "remote"),
      "",
      "New project must have no inherited remote",
    );

    const web = await preflight(repo, ["--target=web"]);
    const studio = await preflight(repo, ["--target=studio"]);
    const both = await preflight(repo);
    for (const result of [web, studio, both]) {
      assert.equal(result.code, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /0 error\(s\)/);
    }
    assert.equal(
      JSON.parse(await fs.readFile(path.join(repo, "web/package.json"), "utf8"))
        .name,
      "dx-client-web",
    );
    assert.equal(
      JSON.parse(
        await fs.readFile(path.join(repo, "studio/package.json"), "utf8"),
      ).name,
      "dx-client-studio",
    );
  });
});

test("an unchanged starter clone can detach its Git history only with explicit new-project confirmation", async () => {
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "proti-dx-clone-"));
  const repo = path.join(sandbox, "client");
  try {
    for (const directory of ["", "scripts", "web", "studio"]) {
      await fs.mkdir(path.join(repo, directory), { recursive: true });
    }
    await copyScript(path.join(here, "proti-init.mjs"), repo, "proti-init.mjs");
    for (const directory of ["", "web", "studio"]) {
      await fs.writeFile(
        path.join(repo, directory, "package.json"),
        JSON.stringify({ name: "starter", private: true }),
      );
    }
    git(repo, "init", "-b", "main");
    git(repo, "config", "user.name", "Fixture Developer");
    git(repo, "config", "user.email", "fixture@example.invalid");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "isolated starter fixture");
    git(
      repo,
      "remote",
      "add",
      "origin",
      "https://github.com/jchaiet/proti-demo.git",
    );
    const initialHead = git(repo, "rev-parse", "HEAD");

    const refusal = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: answers,
      env: isolatedEnv,
    });
    assert.notEqual(refusal.code, 0);
    assert.match(refusal.stderr, /--new-project/);
    assert.equal(git(repo, "rev-parse", "HEAD"), initialHead);
    assert.equal(
      git(repo, "remote", "get-url", "origin"),
      "https://github.com/jchaiet/proti-demo.git",
    );

    const incorrectConfirmation = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      args: ["--new-project"],
      input: scriptedInput(["I agree", ...answers.trimEnd().split("\n")]),
      env: isolatedEnv,
    });
    assert.notEqual(incorrectConfirmation.code, 0);
    assert.match(incorrectConfirmation.stderr, /not confirmed/);
    assert.equal(git(repo, "rev-parse", "HEAD"), initialHead);
    assert.equal(
      git(repo, "remote", "get-url", "origin"),
      "https://github.com/jchaiet/proti-demo.git",
    );

    const initialized = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      args: ["--new-project"],
      input: scriptedInput([
        "RESET GIT HISTORY",
        ...answers.trimEnd().split("\n"),
      ]),
      env: isolatedEnv,
    });
    assert.equal(initialized.code, 0, initialized.stderr);
    assert.equal(git(repo, "remote"), "");
    assert.equal(
      git(repo, "config", "--local", "--get", "proti.initialized"),
      "true",
    );
    assert.match(initialized.stdout, /Previous Git metadata backed up at:/);
    assert.equal(
      JSON.parse(
        await fs.readFile(path.join(repo, "proti.config.json"), "utf8"),
      ).sanity.projectId,
      "dx12345",
    );
  } finally {
    await fs.rm(sandbox, { recursive: true, force: true });
  }
});

test("config drift is rejected by the same preflight command used locally", async () => {
  await withInitializedSite(async (repo) => {
    const studioEnv = path.join(repo, "studio", ".env.local");
    await fs.appendFile(studioEnv, "\nSANITY_STUDIO_DATASET=other\n");
    const bad = await preflight(repo);
    assert.equal(bad.code, 1, bad.stdout + bad.stderr);
    assert.match(bad.stdout, /Sanity consistency/);
    assert.match(bad.stdout, /SANITY_STUDIO_DATASET/);
    assert.doesNotMatch(
      bad.stdout,
      /dx12345|other/,
      "Diagnostic should not print configuration values",
    );
  });
});

test("CI ignores local Web .env files but succeeds with exported variables", async () => {
  await withInitializedSite(async (repo) => {
    const withoutExports = await preflight(repo, ["--target=web", "--mode=ci"]);
    assert.equal(withoutExports.code, 1);
    assert.match(withoutExports.stdout, /NEXT_SANITY_PROJECT_ID — Missing/);

    const withExports = await preflight(repo, ["--target=web", "--mode=ci"], {
      NEXT_SANITY_PROJECT_ID: "dx12345",
      NEXT_SANITY_DATASET: "production",
      NEXT_SANITY_STUDIO_URL: "http://localhost:3333",
    });
    assert.equal(withExports.code, 0, withExports.stdout + withExports.stderr);
  });
});

test("production preflight refuses to expose visual fixture routes", async () => {
  await withInitializedSite(async (repo) => {
    const result = await preflight(
      repo,
      ["--target=web", "--mode=production"],
      {
        PROTI_VISUAL_FIXTURES: "1",
      },
    );
    assert.equal(result.code, 1);
    assert.match(
      result.stdout,
      /PROTI_VISUAL_FIXTURES=1 must not be deployed publicly/,
    );
  });
});

test("maintained-source protection stops a second initializer before changing any config or Git metadata", async () => {
  await withInitializedSite(async (repo) => {
    git(repo, "config", "--local", "proti.sourceRepository", "true");
    const files = ["proti.config.json", "web/.env.local", "studio/.env.local"];
    const before = await Promise.all(
      files.map((name) => fs.readFile(path.join(repo, name), "utf8")),
    );
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: answers,
      env: isolatedEnv,
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /maintained Proti source repository/);
    const after = await Promise.all(
      files.map((name) => fs.readFile(path.join(repo, name), "utf8")),
    );
    assert.deepEqual(after, before);
    assert.equal(
      git(repo, "config", "--local", "--get", "proti.sourceRepository"),
      "true",
    );
  });
});

test("verification dry-run succeeds without pnpm, writes, network requests or snapshot updates", async () => {
  await withInitializedSite(async (repo) => {
    const files = ["proti.config.json", "web/.env.local", "studio/.env.local"];
    const before = await Promise.all(
      files.map((name) => fs.readFile(path.join(repo, name), "utf8")),
    );
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-verify.mjs",
      args: ["all", "--dry-run"],
      env: { ...isolatedEnv, PATH: "/usr/bin:/bin" },
    });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /10 steps, dry-run/);
    assert.match(result.stdout, /PROTI_VISUAL_FIXTURES=1/);
    assert.doesNotMatch(result.stdout, /--update-snapshots/);
    const after = await Promise.all(
      files.map((name) => fs.readFile(path.join(repo, name), "utf8")),
    );
    assert.deepEqual(after, before);
    await assert.rejects(fs.stat(path.join(repo, "test-results")), {
      code: "ENOENT",
    });
  });
});

test("developer verification steps reference real scripts and Playwright specs", async () => {
  const { createPlan } = await import("./proti-verify.mjs");
  const rootPackage = JSON.parse(
    await fs.readFile(path.join(root, "package.json"), "utf8"),
  );
  const webPackage = JSON.parse(
    await fs.readFile(path.join(root, "web/package.json"), "utf8"),
  );
  const studioPackage = JSON.parse(
    await fs.readFile(path.join(root, "studio/package.json"), "utf8"),
  );
  for (const step of createPlan("all")) {
    const args = step.args;
    const app = args[0] === "--dir" ? args[1] : null;
    const scripts =
      app === "web"
        ? webPackage.scripts
        : app === "studio"
          ? studioPackage.scripts
          : rootPackage.scripts;
    const commandIndex = app ? 2 : 0;
    if (args[commandIndex] === "exec") {
      assert.equal(args[commandIndex + 1], "playwright");
      for (const spec of args.filter(
        (item) => item.startsWith("e2e/") && item.endsWith(".spec.ts"),
      )) {
        await fs.access(path.join(root, app, spec));
      }
    } else {
      assert.ok(
        scripts[args[commandIndex]],
        `Unknown ${app ?? "root"} command: ${args[commandIndex]}`,
      );
    }
  }
});

test("primary developer guides have valid local Markdown link destinations", async () => {
  for (const relative of [
    "docs/GETTING_STARTED.md",
    "docs/ARCHITECTURE.md",
    "docs/COMPONENTS.md",
    "docs/DEVELOPER_COMMANDS.md",
    "docs/TESTING.md",
    "docs/PROJECT_INITIALIZATION.md",
    "docs/DX_REGRESSION.md",
  ]) {
    const source = await fs.readFile(path.join(root, relative), "utf8");
    const links = [...source.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]+")?\)/g)];
    for (const [, url] of links) {
      if (/^(?:https?:|mailto:|#)/i.test(url)) continue;
      const target = decodeURIComponent(url.split("#")[0]);
      if (!target) continue;
      const resolved = path.resolve(root, path.dirname(relative), target);
      assert.ok(
        resolved.startsWith(root + path.sep),
        `Invalid local link in ${relative}: ${url}`,
      );
      await assert.doesNotReject(
        fs.access(resolved),
        `Broken link in ${relative}: ${url}`,
      );
    }
  }
});
