import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const API_VERSION = "2026-08-21";

function parseEnv(source) {
  const values = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const index = line.indexOf("=");

    if (index < 0) {
      continue;
    }

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function localeKey(code) {
  return `locale-${code.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

async function readRequiredJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    throw new Error(
      `Unable to read ${path.relative(ROOT, filePath)}. Run "pnpm proti:init" first.`,
    );
  }
}

async function readLocalWebEnv() {
  try {
    return parseEnv(
      await fs.readFile(path.join(ROOT, "web", ".env.local"), "utf8"),
    );
  } catch {
    return {};
  }
}

function getApiBaseUrl(projectId) {
  const override = process.env.PROTI_SANITY_API_BASE_URL?.trim();

  if (override) {
    return override.replace(/\/+$/, "");
  }

  return `https://${projectId}.api.sanity.io`;
}

async function responseError(response) {
  const body = await response.text();

  if (response.status === 401) {
    return new Error(
      "Sanity rejected SANITY_API_WRITE_TOKEN. Verify that the token is valid for this project.",
    );
  }

  if (response.status === 403) {
    return new Error(
      [
        "SANITY_API_WRITE_TOKEN does not have permission to create documents.",
        'Use an Editor-capable token for this Sanity project, update web/.env.local, and run "pnpm proti:seed" again.',
      ].join(" "),
    );
  }

  return new Error(
    `Sanity request failed: ${response.status}${body ? ` ${body}` : ""}`,
  );
}

const config = await readRequiredJson(path.join(ROOT, "proti.config.json"));

const localEnv = await readLocalWebEnv();

/*
 * The shell environment intentionally wins when explicitly provided.
 * This keeps CI/one-off command overrides possible while web/.env.local
 * remains the normal local-development source.
 */
const token =
  process.env.SANITY_API_WRITE_TOKEN || localEnv.SANITY_API_WRITE_TOKEN;

if (!token) {
  throw new Error(
    [
      "SANITY_API_WRITE_TOKEN is required.",
      "Add an Editor-capable token to web/.env.local or provide it to this command's environment.",
    ].join(" "),
  );
}

const projectId = config.sanity?.projectId;
const dataset = config.sanity?.dataset;
const site = config.site;

if (!projectId || !dataset || !site?.key) {
  throw new Error(
    'proti.config.json is incomplete. Run "pnpm proti:init" again.',
  );
}

const apiBaseUrl = getApiBaseUrl(projectId);
const documentId = `site-${site.key}`;

const queryUrl = `${apiBaseUrl}/v${API_VERSION}/data/query/${dataset}`;

const queryResponse = await fetch(queryUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: `*[_type == "site" && _id == $id][0]._id`,
    params: {
      id: documentId,
    },
  }),
});

if (!queryResponse.ok) {
  throw await responseError(queryResponse);
}

const queryPayload = await queryResponse.json();

if (queryPayload.result) {
  console.log(`Site "${documentId}" already exists. No changes were made.`);

  process.exit(0);
}

const document = {
  _id: documentId,
  _type: "site",
  name: site.name,
  key: site.key,
  domains: site.domains,
  defaultLocale: site.defaultLocale,
  locales: site.locales.map(({ code, label }) => ({
    _key: localeKey(code),
    _type: "siteLocale",
    code,
    label,
  })),
};

const mutationUrl = `${apiBaseUrl}/v${API_VERSION}/data/mutate/${dataset}?returnIds=true`;

const mutationResponse = await fetch(mutationUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mutations: [
      {
        createIfNotExists: document,
      },
    ],
  }),
});

if (!mutationResponse.ok) {
  throw await responseError(mutationResponse);
}

console.log(`Created initial Sanity Site: ${documentId}`);
console.log(`Domains: ${site.domains.join(", ")}`);
console.log(`Default locale: ${site.defaultLocale}`);
console.log(`Locales: ${site.locales.map(({ code }) => code).join(", ")}`);
