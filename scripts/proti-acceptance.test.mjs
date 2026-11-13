import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runNode, scriptedInput } from "./test-helpers.mjs";
import { VISUAL_FIXTURE_BASELINES } from "./proti-visual-fixtures.mjs";

const SOURCE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const SCRIPTS = [
  "proti-init.mjs",
  "proti-seed.mjs",
  "proti-check.mjs",
  "proti-integration-readiness.mjs",
  "proti-visual-init.mjs",
  "proti-visual-fixtures.mjs",
  "proti-configure-production.mjs",
];
const SITE_ID = "site-phase2";

function git(repo, ...args) {
  return execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function createFixture() {
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "proti-acceptance-"));
  const repo = path.join(sandbox, "generated-site");
  for (const dir of ["scripts", "web", "studio", "bin"]) {
    await fs.mkdir(path.join(repo, dir), { recursive: true });
  }
  for (const file of SCRIPTS) {
    await fs.copyFile(
      path.join(SOURCE_ROOT, "scripts", file),
      path.join(repo, "scripts", file),
    );
  }
  for (const [dir, name] of [
    ["", "proti"],
    ["web", "web"],
    ["studio", "studio"],
  ]) {
    await fs.writeFile(
      path.join(repo, dir, "package.json"),
      JSON.stringify({ name, private: true }, null, 2) + "\n",
    );
  }

  // When run from the real starter, test its actual ignore rules. The
  // fallback reproduces the intended policy for a minimal source-only fixture.
  const sourceIgnore = path.join(SOURCE_ROOT, ".gitignore");
  if (existsSync(sourceIgnore)) {
    await fs.copyFile(sourceIgnore, path.join(repo, ".gitignore"));
  } else {
    await fs.writeFile(
      path.join(repo, ".gitignore"),
      ".env*\n**/.env*\n!studio/.env.development\n!studio/.env.production\n",
    );
  }
  for (const subdirectory of ["studio", "web"]) {
    const nestedIgnore = path.join(SOURCE_ROOT, subdirectory, ".gitignore");
    if (existsSync(nestedIgnore)) {
      await fs.copyFile(
        nestedIgnore,
        path.join(repo, subdirectory, ".gitignore"),
      );
    }
  }
  const snapshots = path.join(repo, "web", "e2e", "__screenshots__");
  for (const platform of ["chromium-desktop", "chromium-mobile"]) {
    const dir = path.join(snapshots, platform);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "home.png"), "inherited demo screenshot");
  }

  git(repo, "init", "--quiet", "--initial-branch=main");
  git(repo, "add", "-A");
  git(
    repo,
    "-c",
    "user.name=Proti Demo",
    "-c",
    "user.email=proti@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "Inherited demo history",
  );
  git(
    repo,
    "remote",
    "add",
    "origin",
    "https://github.com/example/proti-demo.git",
  );
  return { sandbox, repo };
}

function json(response, result, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ result }));
}

async function startMockSanity() {
  const documents = new Map();
  const requests = [];
  const server = http.createServer(async (request, response) => {
    try {
      let input = "";
      for await (const chunk of request) input += chunk;
      const body = JSON.parse(input || "{}");
      requests.push({ method: request.method, url: request.url, body });

      if (request.url.includes("/data/mutate/")) {
        for (const mutation of body.mutations ?? []) {
          if (mutation.createIfNotExists) {
            const doc = mutation.createIfNotExists;
            if (!documents.has(doc._id))
              documents.set(doc._id, structuredClone(doc));
          } else if (mutation.patch) {
            const { id, set, setIfMissing } = mutation.patch;
            const doc = documents.get(id);
            if (!doc) throw new Error(`Cannot patch unknown document: ${id}`);
            Object.assign(doc, set ?? {});
            for (const [key, val] of Object.entries(setIfMissing ?? {})) {
              if (doc[key] === undefined) doc[key] = val;
            }
          } else {
            throw new Error("Unexpected Sanity mutation");
          }
        }
        json(response, { transactionId: "mock" });
        return;
      }

      if (request.url.includes("/data/query/")) {
        const query = body.query ?? "";
        const site = documents.get(SITE_ID) ?? null;
        const locale = body.params?.locale;
        if (query.includes('"homepageId"')) {
          const findDoc = (type, criterion) =>
            [...documents.values()].find(
              (doc) =>
                doc._type === type &&
                doc.site?._ref === SITE_ID &&
                doc.locale === locale &&
                criterion(doc),
            )?._id ?? null;
          json(response, {
            homepageId: findDoc("page", (doc) => doc.isHomepage === true),
            headerId: findDoc(
              "navigationHeader",
              (doc) => doc.key === "default-header",
            ),
            footerId: findDoc(
              "navigationFooter",
              (doc) => doc.key === "default-footer",
            ),
            navigationSetId: findDoc(
              "navigationSet",
              (doc) => doc.key === "default",
            ),
          });
          return;
        }
        if (query.includes('"references"')) {
          const references = site?.defaultNavigationSets ?? [];
          const resolved = references
            .map(({ _ref }) => documents.get(_ref))
            .filter(Boolean)
            .map(({ _id, locale: docLocale }) => ({ _id, locale: docLocale }));
          json(response, { references, resolved });
          return;
        }
        json(response, site);
        return;
      }
      json(response, { error: "Unknown endpoint" }, 404);
    } catch (error) {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: String(error) }));
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return {
    documents,
    requests,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "0.0.0.0", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function runProject(
  repo,
  script,
  { args = [], input = "", env = {} } = {},
) {
  return runNode({
    cwd: repo,
    script: `scripts/${script}`,
    args,
    input,
    env: {
      SANITY_API_READ_TOKEN: "",
      SANITY_API_WRITE_TOKEN: "",
      SANITY_REVALIDATE_SECRET: "",
      SANITY_STUDIO_PREVIEW_URL: "",
      CI: "",
      ...env,
    },
  });
}

async function runVisualWithMockPnpm(repo, port) {
  const executable = path.join(repo, "bin", "pnpm");
  await fs.writeFile(
    executable,
    `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { VISUAL_FIXTURE_BASELINES } from "../scripts/proti-visual-fixtures.mjs";
const root = process.cwd();
fs.appendFileSync(path.join(root, "pnpm-invocations.txt"), JSON.stringify({args: process.argv.slice(2), skip: process.env.PLAYWRIGHT_SKIP_WEBSERVER, url: process.env.PLAYWRIGHT_BASE_URL}) + "\\n");
if (process.argv.includes("--update-snapshots")) {
  for (const [browser, images] of Object.entries(VISUAL_FIXTURE_BASELINES)) {
    for (const name of images) {
      const filename = path.join(root, "web/e2e/__screenshots__", browser, name);
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      fs.writeFileSync(filename, "fixture baseline");
    }
  }
}
`,
  );
  await fs.chmod(executable, 0o755);
  return runProject(repo, "proti-visual-init.mjs", {
    env: {
      PATH: `${path.join(repo, "bin")}${path.delimiter}${process.env.PATH}`,
      PROTI_VISUAL_PORT: String(port),
      PLAYWRIGHT_SKIP_WEBSERVER: "1", // The script must override this.
    },
  });
}

test(
  "generated project acceptance: init, seed, verify, visual, production, and reinit",
  {
    skip:
      process.platform === "win32" ? "Uses POSIX fake pnpm executable" : false,
  },
  async () => {
    const { sandbox, repo } = await createFixture();
    const sanity = await startMockSanity();
    try {
      const originalGitDir = path.join(repo, ".git");
      // A normal init in the original template must refuse WITHOUT modifying
      // Git or project configuration. A new project requires explicit consent.
      const blocked = await runProject(repo, "proti-init.mjs", {
        input: scriptedInput(["RESET GIT HISTORY"]),
      });
      assert.notEqual(blocked.code, 0);
      assert.match(blocked.stderr, /--new-project/);
      assert.equal(
        git(repo, "remote", "get-url", "origin"),
        "https://github.com/example/proti-demo.git",
      );
      await assert.rejects(fs.access(path.join(repo, "proti.config.json")), {
        code: "ENOENT",
      });

      const init = await runProject(repo, "proti-init.mjs", {
        args: ["--new-project"],
        input: scriptedInput([
          "RESET GIT HISTORY",
          "Phase 2 Acceptance",
          "phase2-acceptance",
          "phase2mock",
          "production",
          "https://phase2.sanity.studio",
          "http://localhost:3000",
          "Phase 2 Site",
          "phase2",
          "sample.example.com",
          "sample.example.com",
          "https://sample.example.com",
          "en-us",
          "en-us:English (US), es-us:Spanish (US)",
        ]),
      });
      assert.equal(init.code, 0, init.stderr);
      assert.match(init.stdout, /Initialized independent Git repository/);
      assert.equal(git(repo, "remote", "-v"), "");
      assert.equal(
        git(repo, "rev-list", "--count", "--all"),
        "0",
        "Old demo commits must not be inherited",
      );
      assert.equal(
        git(repo, "config", "--local", "--get", "proti.initialized"),
        "true",
      );
      assert.ok((await fs.stat(originalGitDir)).isDirectory());
      for (const platform of ["chromium-desktop", "chromium-mobile"]) {
        await assert.rejects(
          fs.access(
            path.join(repo, "web/e2e/__screenshots__", platform, "home.png"),
          ),
          { code: "ENOENT" },
        );
      }
      const configPath = path.join(repo, "proti.config.json");
      const config = JSON.parse(await fs.readFile(configPath, "utf8"));
      assert.deepEqual(config.site.domains, [
        "sample.example.com",
        "localhost",
      ]);
      assert.equal(config.site.canonicalDomain, "sample.example.com");
      assert.equal(config.sanity.projectId, "phase2mock");
      assert.equal(config.sanity.previewUrl, "http://localhost:3000");
      assert.equal(
        config.sanity.productionPreviewUrl,
        "https://sample.example.com",
      );
      const devEnv = await fs.readFile(
        path.join(repo, "studio/.env.development"),
        "utf8",
      );
      const prodEnv = await fs.readFile(
        path.join(repo, "studio/.env.production"),
        "utf8",
      );
      assert.match(devEnv, /SANITY_STUDIO_PREVIEW_URL=http:\/\/localhost:3000/);
      assert.match(
        prodEnv,
        /SANITY_STUDIO_PREVIEW_URL=https:\/\/sample.example.com/,
      );
      assert.doesNotMatch(
        await fs.readFile(path.join(repo, "studio/.env.local"), "utf8"),
        /SANITY_STUDIO_PREVIEW_URL/,
      );

      const webEnvPath = path.join(repo, "web/.env.local");
      const originalWebEnv = await fs.readFile(webEnvPath, "utf8");
      await fs.writeFile(
        webEnvPath,
        originalWebEnv
          .replace(
            "SANITY_API_READ_TOKEN=",
            "SANITY_API_READ_TOKEN=fixture-read",
          )
          .replace(
            "SANITY_API_WRITE_TOKEN=",
            "SANITY_API_WRITE_TOKEN=fixture-write",
          )
          .replace(
            "SANITY_REVALIDATE_SECRET=",
            "SANITY_REVALIDATE_SECRET=fixture-secret",
          ),
      );

      const seed = await runProject(repo, "proti-seed.mjs", {
        args: ["--starter-content"],
        env: { PROTI_SANITY_API_BASE_URL: sanity.baseUrl },
      });
      assert.equal(seed.code, 0, seed.stderr);
      const site = sanity.documents.get(SITE_ID);
      assert.ok(site, "Site should be created by seed");
      assert.deepEqual(site.domains, ["sample.example.com", "localhost"]);
      assert.equal(site.canonicalDomain, "sample.example.com");
      assert.ok(
        [...sanity.documents.values()].some(
          (doc) => doc._type === "page" && doc.isHomepage,
        ),
      );
      assert.ok(
        [...sanity.documents.values()].some(
          (doc) => doc._type === "navigationSet",
        ),
      );
      const firstSeedDocumentCount = sanity.documents.size;
      const secondSeed = await runProject(repo, "proti-seed.mjs", {
        args: ["--starter-content"],
        env: { PROTI_SANITY_API_BASE_URL: sanity.baseUrl },
      });
      assert.equal(secondSeed.code, 0, secondSeed.stderr);
      assert.equal(
        sanity.documents.size,
        firstSeedDocumentCount,
        "Repeated seed must not duplicate content",
      );

      const checkBeforeVisual = await runProject(repo, "proti-check.mjs", {
        env: { PROTI_SANITY_API_BASE_URL: sanity.baseUrl },
      });
      assert.equal(checkBeforeVisual.code, 0, checkBeforeVisual.stderr);
      assert.match(checkBeforeVisual.stdout, /Visual baselines.*Missing/);
      assert.doesNotMatch(checkBeforeVisual.stdout, /✗ /);

      const visual = await runVisualWithMockPnpm(repo, await freePort());
      assert.equal(visual.code, 0, visual.stderr);
      for (const platform of ["chromium-desktop", "chromium-mobile"]) {
        assert.equal(
          await fs.readFile(
            path.join(repo, "web/e2e/__screenshots__", platform, "hero.png"),
            "utf8",
          ),
          "fixture baseline",
        );
      }
      const invocations = (
        await fs.readFile(path.join(repo, "pnpm-invocations.txt"), "utf8")
      )
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      assert.equal(invocations.length, 2);
      assert.deepEqual(invocations[0].args, ["--filter", "./web", "build"]);
      assert.ok(invocations[1].args.includes("--update-snapshots"));
      assert.deepEqual(invocations[1].args.slice(0, 5), [
        "--filter",
        "./web",
        "exec",
        "playwright",
        "test",
      ]);
      assert.equal(invocations[1].skip, "0");

      const configure = await runProject(
        repo,
        "proti-configure-production.mjs",
        {
          args: ["--url=https://sample.example.com"],
        },
      );
      assert.equal(configure.code, 0, configure.stderr);
      const check = await runProject(repo, "proti-check.mjs", {
        env: { PROTI_SANITY_API_BASE_URL: sanity.baseUrl },
      });
      assert.equal(check.code, 0, check.stderr);
      assert.match(check.stdout, /Proti is ready\./);

      // Treat the generated project as a normal Git project. Its non-secret
      // Studio mode files must be stageable; secrets must stay untracked.
      git(repo, "add", "-A");
      const tracked = git(repo, "ls-files").split("\n");
      assert.ok(tracked.includes("studio/.env.development"));
      assert.ok(tracked.includes("studio/.env.production"));
      assert.ok(!tracked.includes("studio/.env.local"));
      assert.ok(!tracked.includes("web/.env.local"));
      git(
        repo,
        "-c",
        "user.name=Proti Test",
        "-c",
        "user.email=proti@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "Initialized independent project",
      );
      const commit = git(repo, "rev-parse", "HEAD");
      git(
        repo,
        "remote",
        "add",
        "origin",
        "git@github.com:example/independent-project.git",
      );
      const reinit = await runProject(repo, "proti-init.mjs", {
        input: scriptedInput(Array(13).fill("")),
      });
      assert.equal(reinit.code, 0, reinit.stderr);
      assert.equal(git(repo, "rev-parse", "HEAD"), commit);
      assert.equal(
        git(repo, "remote", "get-url", "origin"),
        "git@github.com:example/independent-project.git",
      );
      assert.deepEqual(
        JSON.parse(await fs.readFile(configPath, "utf8")).site.domains,
        ["sample.example.com", "localhost"],
      );
      assert.equal(
        await fs.readFile(
          path.join(repo, "web/e2e/__screenshots__/chromium-mobile/hero.png"),
          "utf8",
        ),
        "fixture baseline",
      );
      assert.match(
        await fs.readFile(webEnvPath, "utf8"),
        /SANITY_API_WRITE_TOKEN=fixture-write/,
      );
    } finally {
      await sanity.close();
      await fs.rm(sandbox, { recursive: true, force: true });
      // The old demo Git metadata backup is stored next to generated-site,
      // inside sandbox, and is removed by the cleanup above.
    }
  },
);

// This checks the real original starter's CLI (if present) rather than a
// synthetic fixture. The archive of setup scripts alone doesn't include it.
const studioCliPath = path.join(SOURCE_ROOT, "studio", "sanity.cli.ts");
test(
  "original Studio CLI reads project-specific environment instead of demo IDs",
  {
    skip: !existsSync(studioCliPath)
      ? "Studio source not included in the supplied scripts archive"
      : false,
  },
  async () => {
    const content = await fs.readFile(studioCliPath, "utf8");
    assert.match(content, /SANITY_STUDIO_PROJECT_ID/);
    assert.match(content, /SANITY_STUDIO_DATASET/);
    assert.doesNotMatch(content, /3k4hstk3|wqr59yf1wbq7p3r2861n8z6t/);
  },
);
