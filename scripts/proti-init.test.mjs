import assert from "node:assert/strict";
import fs from "node:fs/promises";
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
      input: scriptedInput(["", "", "test123", "", "", "", "", "", "", "", ""]),
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
        "HTTPS://EXAMPLE.COM/, localhost:3000, example.com",
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

    assert.deepEqual(config.site.domains, ["example.com", "localhost:3000"]);

    assert.equal(config.site.defaultLocale, "en-us");

    assert.deepEqual(
      config.site.locales.map(({ code }) => code),
      ["en-us", "es-us"],
    );
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
      input: scriptedInput(new Array(11).fill("")),
    });

    assert.equal(second.code, 0, second.stderr);

    assert.match(second.stdout, /Project name \[Acme\]/);

    assert.match(second.stdout, /Sanity project ID \[abc123\]/);

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
