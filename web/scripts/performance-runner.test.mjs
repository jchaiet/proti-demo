import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

const fakePnpm = `#!/usr/bin/env node
const { createServer } = require('node:http');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const args = process.argv.slice(2);
if (args[0] !== 'exec') process.exit(2);
if (args[1] === 'next' && args[2] === 'start') {
  const port = Number(args[args.indexOf('-p') + 1]);
  const server = createServer((req, res) => {
    if (req.url === '/api/health') {
      res.writeHead(200); res.end('ok'); return;
    }
    const match = req.url.match(/^\\/visual-fixtures\\/(hero|grid|navigation)$/);
    if (match) {
      res.writeHead(200, {'content-type': 'text/html'});
      res.end('<main data-visual-fixture="' + match[1] + '"></main>'); return;
    }
    res.writeHead(404); res.end();
  });
  server.listen(port, '127.0.0.1');
} else if (args[1] === 'lhci' && args.includes('--version')) {
  process.stdout.write('0.16.0\\n');
} else if (args[1] === 'lhci' && args[2] === 'collect') {
  const dir = join(process.cwd(), '.lighthouseci');
  mkdirSync(dir, { recursive: true });
  const profile = process.env.PROTI_PERF_PROFILE;
  const port = Number(process.env.PROTI_PERF_PORT);
  for (const route of ['hero', 'grid', 'navigation']) {
    for (let i = 0; i < Number(process.env.PROTI_PERF_RUNS); i++) {
      const lhr = {
        requestedUrl: 'http://127.0.0.1:' + port + '/visual-fixtures/' + route,
        categories: { performance: { score: 0.95 } },
        audits: {
          'largest-contentful-paint': { numericValue: 1200 },
          'cumulative-layout-shift': { numericValue: 0 },
          'total-blocking-time': { numericValue: profile === 'mobile' ? 211 : 0 },
          'first-contentful-paint': { numericValue: 950 }
        }
      };
      writeFileSync(join(dir, 'lhr-' + route + '-' + i + '.json'), JSON.stringify(lhr));
    }
  }
} else if (args[1] === 'lhci' && args[2] === 'assert') {
  if (process.env.TEST_FAIL_MOBILE === '1' && process.env.PROTI_PERF_PROFILE === 'mobile') {
    process.exit(1);
  }
} else process.exit(2);
`;

async function runRunner({ failMobile }) {
  const temp = await mkdtemp(join(tmpdir(), "proti-performance-ci-"));
  const webDir = join(temp, "web");
  try {
    const binDir = join(temp, "bin");
    await mkdir(binDir, { recursive: true });
    await mkdir(join(webDir, "scripts"), { recursive: true });
    await mkdir(join(webDir, ".next"), { recursive: true });
    await copyFile(
      join(scriptDirectory, "performance-baseline.mjs"),
      join(webDir, "scripts", "performance-baseline.mjs"),
    );
    await copyFile(
      join(scriptDirectory, "performance-summary.mjs"),
      join(webDir, "scripts", "performance-summary.mjs"),
    );
    await writeFile(join(webDir, ".next", "BUILD_ID"), "fixture");
    await writeFile(join(binDir, "pnpm"), fakePnpm);
    await chmod(join(binDir, "pnpm"), 0o755);

    const port = await availablePort();
    const runner = spawn(
      process.execPath,
      ["scripts/performance-baseline.mjs"],
      {
        cwd: webDir,
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH}`,
          PROTI_PERF_PORT: String(port),
          PROTI_PERF_RUNS: "3",
          CI: "true",
          TEST_FAIL_MOBILE: failMobile ? "1" : "0",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    runner.stdout.on("data", (chunk) => {
      output += chunk;
    });
    runner.stderr.on("data", (chunk) => {
      output += chunk;
    });
    const status = await Promise.race([
      new Promise((resolve, reject) => {
        runner.once("error", reject);
        runner.once("exit", (code) => resolve(code));
      }),
      new Promise((_, reject) =>
        setTimeout(() => {
          runner.kill("SIGKILL");
          reject(new Error(`Mock performance runner timed out: ${output}`));
        }, 20_000).unref(),
      ),
    ]);
    const reportDirectory = join(webDir, "test-results", "performance");
    const summary = JSON.parse(
      await readFile(join(reportDirectory, "summary.json"), "utf8"),
    );
    const markdown = await readFile(
      join(reportDirectory, "summary.md"),
      "utf8",
    );
    const desktop = await readFile(
      join(reportDirectory, "desktop", "lhr-hero-0.json"),
      "utf8",
    );
    const mobile = await readFile(
      join(reportDirectory, "mobile", "lhr-hero-0.json"),
      "utf8",
    );
    return { status, summary, markdown, desktop, mobile, output };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

test(
  "runner saves both profiles and summary before returning a nonzero budget failure",
  { skip: process.platform === "win32" },
  async () => {
    const result = await runRunner({ failMobile: true });
    assert.equal(result.status, 1, result.output);
    assert.equal(result.summary.results.length, 6);
    assert.deepEqual(result.summary.failedProfiles, ["mobile"]);
    assert.match(result.markdown, /FAIL.*mobile/);
    assert.match(result.desktop, /visual-fixtures\/hero/);
    assert.match(result.mobile, /visual-fixtures\/hero/);
  },
);

test(
  "runner succeeds when blocking assertions pass, including TBT above warning threshold",
  { skip: process.platform === "win32" },
  async () => {
    const result = await runRunner({ failMobile: false });
    assert.equal(result.status, 0, result.output);
    assert.deepEqual(result.summary.failedProfiles, []);
    assert.match(result.markdown, /PASS.*desktop and mobile/);
    assert.equal(
      result.summary.results.find(
        (row) => row.profile === "mobile" && row.route === "grid",
      ).tbtMs,
      211,
    );
  },
);
