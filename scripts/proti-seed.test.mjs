import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import test from "node:test";

import {
  copyScript,
  createTempRepo,
  removeTempRepo,
  runNode,
} from "./test-helpers.mjs";

const SEED_SCRIPT = new URL("./proti-seed.mjs", import.meta.url);

async function writeSeedConfig(repo) {
  await fs.writeFile(
    path.join(repo, "proti.config.json"),
    JSON.stringify(
      {
        version: 1,
        projectName: "Acme",
        packageName: "acme",
        sanity: {
          projectId: "abc123",
          dataset: "production",
        },
        site: {
          name: "Acme",
          key: "acme",
          domains: ["localhost", "example.com"],
          defaultLocale: "en-us",
          locales: [
            {
              code: "en-us",
              label: "English (US)",
            },
            {
              code: "es-us",
              label: "Spanish (US)",
            },
          ],
        },
      },
      null,
      2,
    ) + "\n",
  );
}

async function startMockSanity(handler) {
  const requests = [];

  const server = http.createServer(async (request, response) => {
    let body = "";

    for await (const chunk of request) {
      body += chunk;
    }

    const record = {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: body ? JSON.parse(body) : null,
    };

    requests.push(record);

    await handler(record, response, requests);
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  return {
    requests,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }),
  };
}

function json(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json",
  });

  response.end(JSON.stringify(value));
}

test("seed creates the configured Site exactly once", async () => {
  const repo = await createTempRepo();

  const sanity = await startMockSanity(async (request, response) => {
    if (request.url.includes("/data/query/")) {
      json(response, 200, {
        result: null,
      });

      return;
    }

    if (request.url.includes("/data/mutate/")) {
      json(response, 200, {
        transactionId: "transaction-1",
        results: [
          {
            id: "site-acme",
            operation: "create",
          },
        ],
      });

      return;
    }

    json(response, 404, {});
  });

  try {
    await copyScript(SEED_SCRIPT, repo, "proti-seed.mjs");

    await writeSeedConfig(repo);

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-seed.mjs",
      env: {
        SANITY_API_WRITE_TOKEN: "editor-token",
        PROTI_SANITY_API_BASE_URL: sanity.baseUrl,
      },
    });

    assert.equal(result.code, 0, result.stderr);

    assert.match(result.stdout, /Created initial Sanity Site: site-acme/);

    assert.equal(sanity.requests.length, 2);

    const mutation = sanity.requests[1].body.mutations[0].createIfNotExists;

    assert.deepEqual(mutation, {
      _id: "site-acme",
      _type: "site",
      name: "Acme",
      key: "acme",
      domains: ["localhost", "example.com"],
      defaultLocale: "en-us",
      locales: [
        {
          _key: "locale-en-us",
          _type: "siteLocale",
          code: "en-us",
          label: "English (US)",
        },
        {
          _key: "locale-es-us",
          _type: "siteLocale",
          code: "es-us",
          label: "Spanish (US)",
        },
      ],
    });
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("seed is a no-op when the Site already exists", async () => {
  const repo = await createTempRepo();

  const sanity = await startMockSanity(async (request, response) => {
    json(response, 200, {
      result: "site-acme",
    });
  });

  try {
    await copyScript(SEED_SCRIPT, repo, "proti-seed.mjs");

    await writeSeedConfig(repo);

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-seed.mjs",
      env: {
        SANITY_API_WRITE_TOKEN: "editor-token",
        PROTI_SANITY_API_BASE_URL: sanity.baseUrl,
      },
    });

    assert.equal(result.code, 0, result.stderr);

    assert.match(result.stdout, /already exists\. No changes were made\./);

    assert.equal(
      sanity.requests.length,
      1,
      "The mutation endpoint must not be called for an existing Site.",
    );
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("seed explains insufficient Sanity create permission", async () => {
  const repo = await createTempRepo();

  const sanity = await startMockSanity(async (request, response) => {
    if (request.url.includes("/data/query/")) {
      json(response, 200, {
        result: null,
      });

      return;
    }

    json(response, 403, {
      error: {
        description: 'Insufficient permissions; permission "create" required',
      },
    });
  });

  try {
    await copyScript(SEED_SCRIPT, repo, "proti-seed.mjs");

    await writeSeedConfig(repo);

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-seed.mjs",
      env: {
        SANITY_API_WRITE_TOKEN: "read-only-token",
        PROTI_SANITY_API_BASE_URL: sanity.baseUrl,
      },
    });

    assert.notEqual(result.code, 0);

    assert.match(result.stderr, /does not have permission to create documents/);

    assert.match(result.stderr, /Editor-capable token/);
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("seed fails clearly when no write token is configured", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(SEED_SCRIPT, repo, "proti-seed.mjs");

    await writeSeedConfig(repo);

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-seed.mjs",
      env: {
        SANITY_API_WRITE_TOKEN: "",
      },
    });

    assert.notEqual(result.code, 0);

    assert.match(result.stderr, /SANITY_API_WRITE_TOKEN is required/);
  } finally {
    await removeTempRepo(repo);
  }
});
