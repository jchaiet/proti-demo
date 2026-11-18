import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  checkEnvironment,
  formatReport,
  parseOptions,
} from "./proti-env-check.mjs";

const config = {
  sanity: {
    projectId: "abc123",
    dataset: "production",
    studioUrl: "http://localhost:3333",
    previewUrl: "http://localhost:3000",
    productionPreviewUrl: "https://my-site.example",
  },
};

async function fixture(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "proti-env-test-"));
  try {
    await fs.mkdir(path.join(root, "web"));
    await fs.mkdir(path.join(root, "studio"));
    await fs.writeFile(
      path.join(root, "proti.config.json"),
      JSON.stringify(config),
    );
    await fs.writeFile(
      path.join(root, "web", ".env.local"),
      [
        "NEXT_SANITY_PROJECT_ID=abc123",
        "NEXT_SANITY_DATASET=production",
        "NEXT_SANITY_STUDIO_URL=http://localhost:3333",
      ].join("\n") + "\n",
    );
    await fs.writeFile(
      path.join(root, "studio", ".env.local"),
      [
        "SANITY_STUDIO_PROJECT_ID=abc123",
        "SANITY_STUDIO_DATASET=production",
        "SANITY_STUDIO_TITLE=Example",
      ].join("\n") + "\n",
    );
    await fs.writeFile(
      path.join(root, "studio", ".env.development"),
      "SANITY_STUDIO_PREVIEW_URL=http://localhost:3000\n",
    );
    await fs.writeFile(
      path.join(root, "studio", ".env.production"),
      "SANITY_STUDIO_PREVIEW_URL=https://my-site.example\n",
    );
    return await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
const errs = (items) => items.filter(({ level }) => level === "error");
const by = (items, key) => items.filter(({ name }) => name === key);

test("development preflight succeeds with configured Web/Studio and optional secret warnings", async () => {
  await fixture(async (root) => {
    const issues = await checkEnvironment({ root, runtimeEnv: {} });
    assert.equal(errs(issues).length, 0);
    assert.equal(by(issues, "SANITY_API_READ_TOKEN")[0].level, "warn");
    assert.match(
      formatReport(issues, { mode: "development", target: "all" }).message,
      /passed/,
    );
  });
});

test("missing and invalid required settings fail with variable names, not values", async () => {
  await fixture(async (root) => {
    await fs.writeFile(
      path.join(root, "web", ".env.local"),
      "NEXT_SANITY_PROJECT_ID=NOT_VALID\nNEXT_SANITY_STUDIO_URL=https://user:private-token@example.com/sanity\n",
    );
    const issues = await checkEnvironment({
      root,
      target: "web",
      runtimeEnv: {},
    });
    assert.equal(by(issues, "NEXT_SANITY_PROJECT_ID")[0].level, "error");
    assert.equal(by(issues, "NEXT_SANITY_DATASET")[0].level, "error");
    assert.equal(by(issues, "NEXT_SANITY_STUDIO_URL")[0].level, "error");
    const report = formatReport(issues, {
      mode: "development",
      target: "web",
    }).message;
    assert.doesNotMatch(report, /private-token|NOT_VALID|user:/);
  });
});

test("config drift and cross-app mismatch are errors", async () => {
  await fixture(async (root) => {
    const issues = await checkEnvironment({
      root,
      runtimeEnv: { SANITY_STUDIO_PROJECT_ID: "another123" },
    });
    assert.equal(
      by(issues, "SANITY_STUDIO_PROJECT_ID").some(
        ({ level }) => level === "error",
      ),
      true,
    );
    assert.equal(by(issues, "Sanity consistency").length > 0, true);
  });
});

test("production mode requires a public HTTPS Studio Presentation origin", async () => {
  await fixture(async (root) => {
    const runtimeEnv = {
      NEXT_SANITY_PROJECT_ID: "abc123",
      NEXT_SANITY_DATASET: "production",
      NEXT_SANITY_STUDIO_URL: "https://cms.example",
      SANITY_STUDIO_PROJECT_ID: "abc123",
      SANITY_STUDIO_DATASET: "production",
      SANITY_STUDIO_PREVIEW_URL: "http://localhost:3000",
    };
    const issues = await checkEnvironment({
      root,
      mode: "production",
      runtimeEnv,
    });
    assert.equal(
      by(issues, "SANITY_STUDIO_PREVIEW_URL").some(
        ({ level }) => level === "error",
      ),
      true,
    );
  });
});

test("production mode rejects fixture route enablement", async () => {
  await fixture(async (root) => {
    const issues = await checkEnvironment({
      root,
      mode: "production",
      target: "web",
      runtimeEnv: {
        NEXT_SANITY_PROJECT_ID: "abc123",
        NEXT_SANITY_DATASET: "production",
        NEXT_SANITY_STUDIO_URL: "http://localhost:3333",
        PROTI_VISUAL_FIXTURES: "1",
      },
    });
    assert.equal(by(issues, "Visual fixtures")[0].level, "error");
  });
});

test("CI mode does not read local secrets and allows visual fixtures with warning", async () => {
  await fixture(async (root) => {
    const issues = await checkEnvironment({
      root,
      mode: "ci",
      target: "web",
      runtimeEnv: {
        NEXT_SANITY_PROJECT_ID: "abc123",
        NEXT_SANITY_DATASET: "production",
        NEXT_SANITY_STUDIO_URL: "http://localhost:3333",
        PROTI_VISUAL_FIXTURES: "1",
      },
    });
    assert.equal(errs(issues).length, 0);
    assert.equal(by(issues, "Visual fixtures")[0].level, "warn");
    const withoutVars = await checkEnvironment({
      root,
      mode: "ci",
      target: "web",
      runtimeEnv: {},
    });
    assert.equal(by(withoutVars, "NEXT_SANITY_PROJECT_ID")[0].level, "error");
  });
});

test("production Studio reads .env.production, but ignores local files in CI", async () => {
  await fixture(async (root) => {
    const issues = await checkEnvironment({
      root,
      mode: "ci",
      target: "studio",
      runtimeEnv: {
        SANITY_STUDIO_PROJECT_ID: "abc123",
        SANITY_STUDIO_DATASET: "production",
      },
    });
    assert.equal(errs(issues).length, 0);
    assert.equal(by(issues, "SANITY_STUDIO_PREVIEW_URL")[0].level, "pass");
  });
});

test("Studio .env.local must not override development/production Presentation URL", async () => {
  await fixture(async (root) => {
    await fs.appendFile(
      path.join(root, "studio", ".env.local"),
      "SANITY_STUDIO_PREVIEW_URL=http://localhost:8888\n",
    );
    const issues = await checkEnvironment({
      root,
      target: "studio",
      runtimeEnv: {},
    });
    assert.equal(by(issues, "Studio environment")[0].level, "error");
  });
});

test("missing config fails for local initialization, warns for deployed env-only checks", async () => {
  await fixture(async (root) => {
    await fs.unlink(path.join(root, "proti.config.json"));
    const local = await checkEnvironment({
      root,
      target: "web",
      runtimeEnv: {},
    });
    assert.equal(by(local, "Project configuration")[0].level, "error");
    const ci = await checkEnvironment({
      root,
      target: "web",
      mode: "ci",
      runtimeEnv: {
        NEXT_SANITY_PROJECT_ID: "abc123",
        NEXT_SANITY_DATASET: "production",
        NEXT_SANITY_STUDIO_URL: "https://cms.example",
      },
    });
    assert.equal(by(ci, "Project configuration")[0].level, "warn");
    assert.equal(errs(ci).length, 0);
  });
});

test("public secret exports are rejected, never displaying their contents", async () => {
  await fixture(async (root) => {
    const issues = await checkEnvironment({
      root,
      target: "web",
      runtimeEnv: {
        NEXT_PUBLIC_SANITY_API_WRITE_TOKEN: "top-secret-canary",
      },
    });
    assert.equal(by(issues, "Public secret exposure")[0].level, "error");
    assert.doesNotMatch(
      formatReport(issues, { mode: "development", target: "web" }).message,
      /top-secret-canary/,
    );
  });
});

test("mode/target CLI flags reject typos and support local alias", () => {
  assert.deepEqual(parseOptions(["--target=web", "--mode=local"]), {
    target: "web",
    mode: "development",
  });
  assert.throws(() => parseOptions(["--mode=stage"]), /--mode must/);
  assert.throws(() => parseOptions(["--target=everything"]), /--target must/);
});

test("no file modifications: environment preflight only reads", async () => {
  await fixture(async (root) => {
    const files = ["proti.config.json", "web/.env.local", "studio/.env.local"];
    const before = await Promise.all(
      files.map((file) => fs.readFile(path.join(root, file), "utf8")),
    );
    await checkEnvironment({ root, runtimeEnv: {} });
    const after = await Promise.all(
      files.map((file) => fs.readFile(path.join(root, file), "utf8")),
    );
    assert.deepEqual(after, before);
  });
});

test("CLI exits 0 on valid local environment and 1 on missing required variables", async () => {
  await fixture(async (root) => {
    const script = new URL("./proti-env-check.mjs", import.meta.url);
    const opts = {
      cwd: root,
      env: { PATH: process.env.PATH },
      encoding: "utf8",
    };
    const pass = spawnSync(
      process.execPath,
      [script.pathname, "--target=web"],
      opts,
    );
    assert.equal(pass.status, 0, pass.stderr || pass.stdout);
    assert.match(pass.stdout, /Environment preflight passed/);
    await fs.writeFile(
      path.join(root, "web", ".env.local"),
      "NEXT_SANITY_DATASET=production\n",
    );
    const fail = spawnSync(
      process.execPath,
      [script.pathname, "--target=web"],
      opts,
    );
    assert.equal(fail.status, 1, fail.stderr || fail.stdout);
    assert.match(fail.stdout, /NEXT_SANITY_PROJECT_ID/);
    assert.match(fail.stdout, /Fix errors before building/);
  });
});

test("production Web requires HTTPS Studio URL", async () => {
  await fixture(async (root) => {
    const issues = await checkEnvironment({
      root,
      target: "web",
      mode: "production",
      runtimeEnv: {
        NEXT_SANITY_PROJECT_ID: "abc123",
        NEXT_SANITY_DATASET: "production",
        NEXT_SANITY_STUDIO_URL: "http://localhost:3333",
      },
    });
    assert.equal(by(issues, "NEXT_SANITY_STUDIO_URL")[0].level, "error");
  });
});
