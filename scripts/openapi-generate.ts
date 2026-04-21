import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "../src/config/zod-openapi-init.js";
import { buildOpenApiV1Document } from "../src/api/v1/openapi.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const generatedDir = join(root, "generated");
const openApiJsonPath = join(generatedDir, "openapi.json");
const apiTypesPath = join(generatedDir, "api-types.ts");

mkdirSync(generatedDir, { recursive: true });
writeFileSync(openApiJsonPath, `${JSON.stringify(buildOpenApiV1Document(), null, 2)}\n`, "utf8");

const cliJs = join(root, "node_modules", "openapi-typescript", "bin", "cli.js");
execFileSync(process.execPath, [cliJs, openApiJsonPath, "-o", apiTypesPath], {
  stdio: "inherit",
  cwd: root,
});
