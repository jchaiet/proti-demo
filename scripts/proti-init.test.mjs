import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

import {
  copyScript,
  createTempRepo,
  removeTempRepo,
  runNode,
  scriptedInput,
} from "./test-helpers.mjs";

const INIT_SCRIPT = new URL("./proti-init.mjs", import.meta.url);

test("fresh clone uses generic defaults and language-region locales", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "",
        "",
        "test123",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]),
    });

    assert.equal(result.code, 0, result.stderr);

    assert.match(result.stdout, /Project name \[Proti Site\]/);

    assert.match(result.stdout, /Package\/project slug \[proti-site\]/);

    assert.match(result.stdout, /Sanity project ID:/);

    assert.doesNotMatch(
      result.stdout,
      /Sanity project ID \[[^\]]+\]/,
      "A fresh clone must not prefill a real Sanity project ID.",
    );

    assert.match(result.stdout, /pnpm proti:seed --starter-content/);

    assert.match(result.stdout, /pnpm proti:check/);

    const config = JSON.parse(
      await fs.readFile(path.join(repo, "proti.config.json"), "utf8"),
    );

    assert.equal(config.projectName, "Proti Site");

    assert.equal(config.packageName, "proti-site");

    assert.equal(config.sanity.projectId, "test123");

    assert.equal(config.sanity.previewUrl, "http://localhost:3000");
    assert.equal(config.sanity.productionPreviewUrl, "");
    const studioEnv = await fs.readFile(
      path.join(repo, "studio", ".env.local"),
      "utf8",
    );
    const developmentEnv = await fs.readFile(
      path.join(repo, "studio", ".env.development"),
      "utf8",
    );
    const productionEnv = await fs.readFile(
      path.join(repo, "studio", ".env.production"),
      "utf8",
    );
    assert.doesNotMatch(studioEnv, /SANITY_STUDIO_PREVIEW_URL=/);
    assert.match(
      developmentEnv,
      /SANITY_STUDIO_PREVIEW_URL=http:\/\/localhost:3000/,
    );
    assert.match(productionEnv, /^SANITY_STUDIO_PREVIEW_URL=$/m);
    assert.match(result.stdout, /pnpm proti:configure:production/);

    assert.equal(config.site.canonicalDomain, "localhost");

    assert.equal(config.site.defaultLocale, "en-us");

    assert.deepEqual(config.site.locales, [
      {
        code: "en-us",
        label: "English (US)",
      },
      {
        code: "es-us",
        label: "Spanish (US)",
      },
    ]);
  } finally {
    await removeTempRepo(repo);
  }
});

test("initializer normalizes project names, domains, and locale input", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "Acme Health",
        "",
        "abc123",
        "production",
        "https://studio.example.com",
        "https://www.example.com",
        "",
        "",
        "HTTPS://EXAMPLE.COM/, localhost, example.com",
        "",
        "https://www.example.com",
        "EN-US",
        "EN-US:English, ES-US:Español",
      ]),
    });

    assert.equal(result.code, 0, result.stderr);

    const config = JSON.parse(
      await fs.readFile(path.join(repo, "proti.config.json"), "utf8"),
    );

    assert.equal(config.packageName, "acme-health");

    assert.equal(config.site.key, "acme-health");

    assert.deepEqual(config.site.domains, ["example.com", "localhost"]);

    assert.equal(config.site.canonicalDomain, "example.com");

    assert.equal(config.sanity.productionPreviewUrl, "https://www.example.com");
    assert.match(
      await fs.readFile(path.join(repo, "studio", ".env.production"), "utf8"),
      /SANITY_STUDIO_PREVIEW_URL=https:\/\/www.example.com/,
    );
    assert.equal(config.site.defaultLocale, "en-us");

    assert.deepEqual(
      config.site.locales.map(({ code }) => code),
      ["en-us", "es-us"],
    );
  } finally {
    await removeTempRepo(repo);
  }
});

test("first init includes localhost when only a production domain is supplied", async () => {
  const repo = await createTempRepo();
  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "Production Only",
        "production-only",
        "abc123",
        "production",
        "",
        "",
        "",
        "",
        "new-site.example.com",
        "",
        "",
        "",
        "",
      ]),
    });
    assert.equal(result.code, 0, result.stderr);
    const config = JSON.parse(
      await fs.readFile(path.join(repo, "proti.config.json"), "utf8"),
    );
    assert.deepEqual(config.site.domains, [
      "new-site.example.com",
      "localhost",
    ]);
    assert.equal(config.site.canonicalDomain, "new-site.example.com");
  } finally {
    await removeTempRepo(repo);
  }
});

test("reinit preserves an intentional localhost removal from initialized Site domains", async () => {
  const repo = await createTempRepo();
  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");
    const first = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "Production Only",
        "production-only",
        "abc123",
        "production",
        "",
        "",
        "",
        "",
        "site.example.com",
        "",
        "",
        "",
        "",
      ]),
    });
    assert.equal(first.code, 0, first.stderr);
    const configPath = path.join(repo, "proti.config.json");
    const config = JSON.parse(await fs.readFile(configPath, "utf8"));
    config.site.domains = ["site.example.com"];
    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
    const second = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(Array(13).fill("")),
    });
    assert.equal(second.code, 0, second.stderr);
    const reinitialized = JSON.parse(await fs.readFile(configPath, "utf8"));
    assert.deepEqual(reinitialized.site.domains, ["site.example.com"]);
  } finally {
    await removeTempRepo(repo);
  }
});

test("initializer rejects a canonical domain outside Site domains", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "Acme",
        "acme",
        "abc123",
        "production",
        "",
        "",
        "Acme",
        "acme",
        "example.com, www.example.com",
        "canonical.example.com",
        "",
      ]),
    });

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /must be included in Site domains/);
  } finally {
    await removeTempRepo(repo);
  }
});

test("initializer accepts three-letter language codes", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "Filipino Site",
        "filipino-site",
        "abc123",
        "production",
        "",
        "",
        "",
        "",
        "localhost",
        "",
        "",
        "fil-ph",
        "fil-ph:Filipino (Philippines), en-us:English (US)",
      ]),
    });

    assert.equal(result.code, 0, result.stderr);

    const config = JSON.parse(
      await fs.readFile(path.join(repo, "proti.config.json"), "utf8"),
    );

    assert.equal(config.site.defaultLocale, "fil-ph");
    assert.deepEqual(
      config.site.locales.map(({ code }) => code),
      ["fil-ph", "en-us"],
    );
  } finally {
    await removeTempRepo(repo);
  }
});

test("initializer rejects Site domains with ports", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "",
        "",
        "abc123",
        "",
        "",
        "",
        "",
        "",
        "localhost:3000",
        "",
      ]),
    });

    assert.notEqual(result.code, 0);

    assert.match(result.stderr, /must not include a port/);
  } finally {
    await removeTempRepo(repo);
  }
});

test("rerunning the initializer reuses local values and preserves secrets", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const first = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "Acme",
        "acme",
        "abc123",
        "production",
        "http://localhost:3333",
        "http://localhost:3000",
        "Acme",
        "acme",
        "localhost",
        "",
        "",
        "en-us",
        "en-us:English, es-us:Spanish",
      ]),
    });

    assert.equal(first.code, 0, first.stderr);

    const webEnvPath = path.join(repo, "web", ".env.local");

    let env = await fs.readFile(webEnvPath, "utf8");

    env = env
      .replace("SANITY_API_READ_TOKEN=", "SANITY_API_READ_TOKEN=read-token")
      .replace("SANITY_API_WRITE_TOKEN=", "SANITY_API_WRITE_TOKEN=write-token")
      .replace(
        "SANITY_REVALIDATE_SECRET=",
        "SANITY_REVALIDATE_SECRET=revalidate-secret",
      );

    await fs.writeFile(webEnvPath, env);

    const second = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(new Array(13).fill("")),
    });

    assert.equal(second.code, 0, second.stderr);

    assert.match(second.stdout, /Project name \[Acme\]/);

    assert.match(second.stdout, /Sanity project ID \[abc123\]/);

    const devAfter = await fs.readFile(
      path.join(repo, "studio", ".env.development"),
      "utf8",
    );
    const prodAfter = await fs.readFile(
      path.join(repo, "studio", ".env.production"),
      "utf8",
    );
    assert.match(devAfter, /SANITY_STUDIO_PREVIEW_URL=http:\/\/localhost:3000/);
    assert.match(prodAfter, /^SANITY_STUDIO_PREVIEW_URL=$/m);
    const rewrittenStudioEnv = await fs.readFile(
      path.join(repo, "studio", ".env.local"),
      "utf8",
    );
    assert.doesNotMatch(rewrittenStudioEnv, /SANITY_STUDIO_PREVIEW_URL=/);

    const rewrittenEnv = await fs.readFile(webEnvPath, "utf8");

    assert.match(rewrittenEnv, /SANITY_API_READ_TOKEN=read-token/);

    assert.match(rewrittenEnv, /SANITY_API_WRITE_TOKEN=write-token/);

    assert.match(rewrittenEnv, /SANITY_REVALIDATE_SECRET=revalidate-secret/);
  } finally {
    await removeTempRepo(repo);
  }
});

test("initializer rejects malformed locale shapes", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "",
        "",
        "abc123",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "en-usa",
        "en-usa:English",
      ]),
    });

    assert.notEqual(result.code, 0);

    assert.match(result.stderr, /Use language-region format, e\.g\. en-us/);
  } finally {
    await removeTempRepo(repo);
  }
});

test("first initialization clears inherited visual baselines and rerun preserves new ones", async () => {
  const repo = await createTempRepo();
  const snapshots = path.join(
    repo,
    "web",
    "e2e",
    "__screenshots__",
    "chromium-desktop",
  );
  const screenshot = path.join(snapshots, "home.png");
  const note = path.join(snapshots, "README.md");
  const mobileScreenshot = path.join(
    repo,
    "web",
    "e2e",
    "__screenshots__",
    "chromium-mobile",
    "home.png",
  );

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");
    await fs.mkdir(snapshots, { recursive: true });
    await fs.mkdir(path.dirname(mobileScreenshot), { recursive: true });
    await fs.writeFile(screenshot, "inherited demo screenshot");
    await fs.writeFile(mobileScreenshot, "inherited mobile screenshot");
    await fs.writeFile(note, "Snapshot directory information");

    const first = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(["", "", "abc123", ...new Array(10).fill("")]),
    });

    assert.equal(first.code, 0, first.stderr);
    assert.match(first.stdout, /Removed inherited demo visual baselines/);
    assert.match(first.stdout, /pnpm proti:visual:init/);
    await assert.rejects(fs.access(screenshot), { code: "ENOENT" });
    await assert.rejects(fs.access(mobileScreenshot), { code: "ENOENT" });
    assert.equal(
      await fs.readFile(note, "utf8"),
      "Snapshot directory information",
    );
    assert.ok((await fs.stat(snapshots)).isDirectory());
    assert.ok((await fs.stat(path.dirname(mobileScreenshot))).isDirectory());

    await fs.mkdir(snapshots, { recursive: true });
    await fs.writeFile(screenshot, "new project screenshot");

    const second = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(new Array(13).fill("")),
    });

    assert.equal(second.code, 0, second.stderr);
    assert.doesNotMatch(
      second.stdout,
      /Removed inherited demo visual baselines/,
    );
    assert.equal(
      await fs.readFile(screenshot, "utf8"),
      "new project screenshot",
    );
  } finally {
    await removeTempRepo(repo);
  }
});

function gitIn(repo, ...args) {
  return execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function createStarterCloneFixture() {
  const repo = await createTempRepo();
  await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");
  gitIn(repo, "init", "--quiet", "--initial-branch=main");
  gitIn(
    repo,
    "remote",
    "add",
    "origin",
    "git@github.com:example/proti-demo.git",
  );
  const screenshot = path.join(
    repo,
    "web/e2e/__screenshots__/chromium-mobile/home.png",
  );
  await fs.mkdir(path.dirname(screenshot), { recursive: true });
  await fs.writeFile(screenshot, "inherited screenshot");
  gitIn(repo, "add", "-A");
  gitIn(
    repo,
    "-c",
    "user.name=Proti Test",
    "-c",
    "user.email=proti@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "Existing starter history",
  );
  return { repo, screenshot, commit: gitIn(repo, "rev-parse", "HEAD") };
}

const initialAnswers = ["", "", "abc123", ...new Array(10).fill("")];

test("accidental init in the original starter refuses before modifying any files or Git history", async () => {
  const { repo, screenshot, commit } = await createStarterCloneFixture();
  try {
    const packageBefore = await fs.readFile(
      path.join(repo, "package.json"),
      "utf8",
    );
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(initialAnswers),
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /--new-project/);
    assert.equal(gitIn(repo, "rev-parse", "HEAD"), commit);
    assert.equal(
      gitIn(repo, "remote", "get-url", "origin"),
      "git@github.com:example/proti-demo.git",
    );
    assert.equal(
      await fs.readFile(path.join(repo, "package.json"), "utf8"),
      packageBefore,
    );
    assert.equal(await fs.readFile(screenshot, "utf8"), "inherited screenshot");
    await assert.rejects(fs.access(path.join(repo, "proti.config.json")), {
      code: "ENOENT",
    });
    assert.equal(gitIn(repo, "status", "--porcelain"), "");
  } finally {
    await removeTempRepo(repo);
  }
});

test("maintained source repository refuses all initialization before any file or Git changes", async () => {
  const { repo, screenshot, commit } = await createStarterCloneFixture();
  try {
    gitIn(repo, "config", "--local", "proti.sourceRepository", "true");
    const packageBefore = await fs.readFile(
      path.join(repo, "package.json"),
      "utf8",
    );
    const beforeStatus = gitIn(repo, "status", "--porcelain");
    for (const args of [[], ["--new-project"]]) {
      const result = await runNode({
        cwd: repo,
        script: "scripts/proti-init.mjs",
        args,
        input: scriptedInput(["RESET GIT HISTORY", ...initialAnswers]),
      });
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /maintained Proti source repository/);
      assert.equal(gitIn(repo, "rev-parse", "HEAD"), commit);
      assert.equal(
        gitIn(repo, "remote", "get-url", "origin"),
        "git@github.com:example/proti-demo.git",
      );
      assert.equal(
        await fs.readFile(path.join(repo, "package.json"), "utf8"),
        packageBefore,
      );
      assert.equal(
        await fs.readFile(screenshot, "utf8"),
        "inherited screenshot",
      );
      assert.equal(gitIn(repo, "status", "--porcelain"), beforeStatus);
      await assert.rejects(fs.access(path.join(repo, "proti.config.json")), {
        code: "ENOENT",
      });
    }
  } finally {
    await removeTempRepo(repo);
  }
});

test("--new-project requires exact typed acknowledgement before any changes", async () => {
  const { repo, commit } = await createStarterCloneFixture();
  try {
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      args: ["--new-project"],
      input: scriptedInput(["yes", ...initialAnswers]),
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /not confirmed/);
    assert.equal(gitIn(repo, "rev-parse", "HEAD"), commit);
    assert.equal(
      gitIn(repo, "remote", "get-url", "origin"),
      "git@github.com:example/proti-demo.git",
    );
    await assert.rejects(fs.access(path.join(repo, "proti.config.json")), {
      code: "ENOENT",
    });
  } finally {
    await removeTempRepo(repo);
  }
});

test("--new-project refuses dirty clones, including untracked files", async () => {
  const { repo, commit } = await createStarterCloneFixture();
  try {
    await fs.writeFile(path.join(repo, "new-file.txt"), "do not discard");
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      args: ["--new-project"],
      input: scriptedInput(["RESET GIT HISTORY", ...initialAnswers]),
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /working tree contains changes/);
    assert.equal(gitIn(repo, "rev-parse", "HEAD"), commit);
    assert.equal(
      await fs.readFile(path.join(repo, "new-file.txt"), "utf8"),
      "do not discard",
    );
    await assert.rejects(fs.access(path.join(repo, "proti.config.json")), {
      code: "ENOENT",
    });
  } finally {
    await removeTempRepo(repo);
  }
});

test("explicit --new-project detaches a clean starter clone and clears inherited screenshots", async () => {
  const { repo, screenshot, commit } = await createStarterCloneFixture();
  try {
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      args: ["--new-project"],
      input: scriptedInput(["RESET GIT HISTORY", ...initialAnswers]),
    });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Initialized independent Git repository/);
    assert.match(result.stdout, /Removed inherited demo visual baselines/);
    assert.equal(gitIn(repo, "remote", "-v"), "");
    assert.equal(gitIn(repo, "rev-list", "--count", "--all"), "0");
    assert.equal(
      gitIn(repo, "config", "--local", "--get", "proti.initialized"),
      "true",
    );
    assert.notEqual(gitIn(repo, "rev-parse", "--git-dir"), "");
    await assert.rejects(fs.access(screenshot), { code: "ENOENT" });
    assert.ok(commit);
  } finally {
    await removeTempRepo(repo);
  }
});

test("an existing custom repository retains its history, remotes, and screenshots", async () => {
  const { repo, screenshot, commit } = await createStarterCloneFixture();
  try {
    gitIn(
      repo,
      "remote",
      "set-url",
      "origin",
      "git@github.com:example/independent-project.git",
    );
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(initialAnswers),
    });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(gitIn(repo, "rev-parse", "HEAD"), commit);
    assert.equal(
      gitIn(repo, "remote", "get-url", "origin"),
      "git@github.com:example/independent-project.git",
    );
    assert.equal(await fs.readFile(screenshot, "utf8"), "inherited screenshot");
    const force = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      args: ["--new-project"],
      input: scriptedInput(["RESET GIT HISTORY", ...initialAnswers]),
    });
    assert.notEqual(force.code, 0);
    assert.match(force.stderr, /already initialized/);
    assert.equal(gitIn(repo, "rev-parse", "HEAD"), commit);
  } finally {
    await removeTempRepo(repo);
  }
});

test("first initialization in an existing custom repository marks it without touching history", async () => {
  const { repo, commit } = await createStarterCloneFixture();
  try {
    gitIn(
      repo,
      "remote",
      "set-url",
      "origin",
      "git@github.com:example/custom-site.git",
    );
    const first = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "Custom Site",
        "custom-site",
        "abc123",
        "production",
        "",
        "",
        "",
        "",
        "example.org",
        "example.org",
        "",
        "",
        "",
      ]),
    });
    assert.equal(first.code, 0, first.stderr);
    assert.equal(gitIn(repo, "rev-parse", "HEAD"), commit);
    assert.equal(
      gitIn(repo, "config", "--local", "--get", "proti.initialized"),
      "true",
    );
    const configPath = path.join(repo, "proti.config.json");
    const config = JSON.parse(await fs.readFile(configPath, "utf8"));
    assert.deepEqual(config.site.domains, ["example.org", "localhost"]);
    config.site.domains = ["example.org"];
    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
    const rerun = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(Array(13).fill("")),
    });
    assert.equal(rerun.code, 0, rerun.stderr);
    assert.deepEqual(
      JSON.parse(await fs.readFile(configPath, "utf8")).site.domains,
      ["example.org"],
    );
    assert.equal(gitIn(repo, "rev-parse", "HEAD"), commit);
  } finally {
    await removeTempRepo(repo);
  }
});

test("refuses reset when starter clone has an unexpected push URL", async () => {
  const { repo, commit } = await createStarterCloneFixture();
  try {
    gitIn(
      repo,
      "remote",
      "set-url",
      "--push",
      "origin",
      "git@github.com:example/production-repo.git",
    );
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      args: ["--new-project"],
      input: scriptedInput(["RESET GIT HISTORY", ...initialAnswers]),
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /unexpected Git remotes or push URL/);
    assert.equal(gitIn(repo, "rev-parse", "HEAD"), commit);
  } finally {
    await removeTempRepo(repo);
  }
});

test("existing initialized project preserves a manually added starter remote", async () => {
  const repo = await createTempRepo();
  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");
    const first = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(initialAnswers),
    });
    assert.equal(first.code, 0, first.stderr);
    gitIn(repo, "add", "-A");
    gitIn(
      repo,
      "-c",
      "user.name=Proti Test",
      "-c",
      "user.email=proti@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "Project initialized",
    );
    gitIn(
      repo,
      "remote",
      "add",
      "origin",
      "git@github.com:example/proti-demo.git",
    );
    const commit = gitIn(repo, "rev-parse", "HEAD");
    const next = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(Array(13).fill("")),
    });
    assert.equal(next.code, 0, next.stderr);
    assert.equal(gitIn(repo, "rev-parse", "HEAD"), commit);
    assert.equal(
      gitIn(repo, "remote", "get-url", "origin"),
      "git@github.com:example/proti-demo.git",
    );
  } finally {
    await removeTempRepo(repo);
  }
});

test("reinitialization migrates old Studio preview URL out of .env.local and preserves App ID", async () => {
  const repo = await createTempRepo();
  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");
    await fs.writeFile(
      path.join(repo, "studio", ".env.local"),
      [
        "SANITY_STUDIO_PROJECT_ID=abc123",
        "SANITY_STUDIO_DATASET=production",
        "SANITY_STUDIO_APP_ID=existing-app-id",
        "SANITY_STUDIO_PREVIEW_URL=http://localhost:3000",
        "",
      ].join("\n"),
    );
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(["", "", "", ...Array(10).fill("")]),
    });
    assert.equal(result.code, 0, result.stderr);
    assert.match(
      await fs.readFile(path.join(repo, "studio", ".env.local"), "utf8"),
      /SANITY_STUDIO_APP_ID=existing-app-id/,
    );
    assert.doesNotMatch(
      await fs.readFile(path.join(repo, "studio", ".env.local"), "utf8"),
      /SANITY_STUDIO_PREVIEW_URL=/,
    );
    assert.match(
      await fs.readFile(path.join(repo, "studio", ".env.development"), "utf8"),
      /SANITY_STUDIO_PREVIEW_URL=http:\/\/localhost:3000/,
    );
  } finally {
    await removeTempRepo(repo);
  }
});

test("initializer rejects localhost as production Presentation URL", async () => {
  const repo = await createTempRepo();
  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");
    const input = [
      "",
      "",
      "abc123",
      "",
      "",
      "",
      "",
      "",
      "localhost",
      "",
      "http://localhost:3000",
    ];
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(input),
    });
    assert.notEqual(result.code, 0);
    assert.match(
      result.stderr,
      /Production preview URL must be a public HTTPS origin/,
    );
  } finally {
    await removeTempRepo(repo);
  }
});
