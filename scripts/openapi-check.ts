import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "../src/config/zod-openapi-init.js";
import { buildOpenApiV1Document } from "../src/api/v1/openapi.js";
import { listMountedContractOperations } from "../src/api/v1/list-contract-operations.js";
import { enforceStrictOpenApiContract } from "../src/common/http/openapi-contract-strict.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const openApiJsonPath = join(root, "generated", "openapi.json");

/** Deterministic JSON for diffing (object key order normalized). */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) {
      sorted[k] = sortKeysDeep(o[k]);
    }
    return sorted;
  }
  return value;
}

function canonicalJsonString(doc: unknown): string {
  return `${JSON.stringify(sortKeysDeep(doc), null, 2)}\n`;
}

let onDisk: string;
try {
  onDisk = readFileSync(openApiJsonPath, "utf8");
} catch {
  console.error(
    `Missing ${openApiJsonPath}. Run: npm run openapi:generate\n` +
      "(Requires dummy MONGODB_URI / JWT_* like the npm script; see package.json.)",
  );
  process.exit(1);
}

const fresh = canonicalJsonString(buildOpenApiV1Document());
const normalizedDisk = canonicalJsonString(JSON.parse(onDisk) as unknown);

if (fresh !== normalizedDisk) {
  console.error(
    "OpenAPI drift: generated/openapi.json does not match buildOpenApiV1Document().\n" +
      "Regenerate and commit:\n" +
      "  npm run openapi:generate\n",
  );
  process.exit(1);
}

console.log("openapi:check OK (generated/openapi.json matches registry).");

const doc = buildOpenApiV1Document();
const contractIssues = enforceStrictOpenApiContract(listMountedContractOperations(), doc);
if (contractIssues.length > 0) {
  console.error(
    "OpenAPI strict contract check failed:\n" +
      contractIssues.map((line) => `  - ${line}`).join("\n") +
      "\n\nPolicy: every HTTP route must be declared via HttpEndpointRegistry + define*Endpoint, " +
      "contributed to buildOpenApiV1Document, and listed in listMountedContractOperations().",
  );
  process.exit(1);
}

console.log("openapi:check OK (strict contract: registry ↔ OpenAPI + JSON schemas).");
