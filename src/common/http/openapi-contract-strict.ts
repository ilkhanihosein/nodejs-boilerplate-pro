import type { OpenAPIObject } from "openapi3-ts/oas30";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"] as const;

const PATH_ITEM_META = new Set([
  "parameters",
  "servers",
  "summary",
  "description",
  "$ref",
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
]);

function hasJsonSchema(schema: unknown): boolean {
  return schema !== undefined && schema !== null && typeof schema === "object";
}

function collectOperationKeysFromDoc(doc: OpenAPIObject): Set<string> {
  const keys = new Set<string>();
  for (const [path, pathItem] of Object.entries(doc.paths)) {
    const item = pathItem as Record<string, unknown>;
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (op && typeof op === "object" && "responses" in op) {
        keys.add(`${method.toUpperCase()} ${path}`);
      }
    }
  }
  return keys;
}

function validateOperationShape(
  method: string,
  path: string,
  op: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  const responses = op.responses;
  if (!responses || typeof responses !== "object") {
    return [`${method.toUpperCase()} ${path}: missing responses`];
  }
  for (const [code, res] of Object.entries(responses)) {
    if (code === "default") {
      continue;
    }
    if (!res || typeof res !== "object") {
      continue;
    }
    const json = (res as { content?: Record<string, { schema?: unknown }> }).content?.[
      "application/json"
    ];
    if (!hasJsonSchema(json?.schema)) {
      errors.push(
        `${method.toUpperCase()} ${path}: response ${code} must define content['application/json'].schema`,
      );
    }
  }
  if (method === "post" || method === "put" || method === "patch") {
    const rb = op.requestBody as { content?: Record<string, { schema?: unknown }> } | undefined;
    const sch = rb?.content?.["application/json"]?.schema;
    if (!hasJsonSchema(sch)) {
      errors.push(
        `${method.toUpperCase()} ${path}: requestBody with content['application/json'].schema is required`,
      );
    }
  }
  return errors;
}

function strictSchemaIssuesForDoc(doc: OpenAPIObject): string[] {
  const errors: string[] = [];
  for (const [path, pathItem] of Object.entries(doc.paths)) {
    const item = pathItem as Record<string, unknown>;
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op || typeof op !== "object" || !("responses" in op)) {
        continue;
      }
      errors.push(...validateOperationShape(method, path, op as Record<string, unknown>));
    }
    for (const key of Object.keys(item)) {
      if (PATH_ITEM_META.has(key)) {
        continue;
      }
      errors.push(
        `${path}: unknown path item key "${key}" (contract paths must only declare HTTP operations + optional parameters)`,
      );
    }
  }
  return errors;
}

export type ListedContractOperation = { readonly method: string; readonly path: string };

/**
 * Ensures every mounted contract operation appears in the OpenAPI document, the document has no
 * extra operations under `paths`, and each operation declares JSON request/response schemas where required.
 */
export function enforceStrictOpenApiContract(
  mounted: ReadonlyArray<ListedContractOperation>,
  doc: OpenAPIObject,
): string[] {
  const fromDoc = collectOperationKeysFromDoc(doc);
  const fromCode = new Set(mounted.map((o) => `${o.method.toUpperCase()} ${o.path}`));

  const errors: string[] = [];
  for (const k of fromCode) {
    if (!fromDoc.has(k)) {
      errors.push(`OpenAPI document missing operation registered in code: ${k}`);
    }
  }
  for (const k of fromDoc) {
    if (!fromCode.has(k)) {
      errors.push(
        `OpenAPI documents an operation not listed in contract registries (undocumented route risk): ${k}`,
      );
    }
  }
  errors.push(...strictSchemaIssuesForDoc(doc));
  return errors;
}
