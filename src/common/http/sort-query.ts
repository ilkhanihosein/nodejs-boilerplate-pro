import { z } from "zod";

/**
 * List sorting contract (use everywhere lists are sorted):
 * - **Schema:** `sortQuerySchema(ALLOWED_FIELDS)` on the route query.
 * - **Service:** `mongoSortFromSortQuery(query.sort, ALLOWED_FIELDS, DEFAULT_SORT)` — do not parse `sort` or build Mongo sort objects elsewhere.
 */

/** Shared `asc` / `desc` literal for sort direction (OpenAPI + runtime). */
export const sortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof sortDirectionSchema>;

const SORT_TOKEN_PATTERN = /^([a-zA-Z_][a-zA-Z0-9_]*):(asc|desc)$/;

/**
 * Parses a single `field:direction` token (e.g. `createdAt:desc`).
 * Field names are restricted to a safe identifier shape for query strings.
 */
export function parseSortToken(raw: string): { field: string; direction: SortDirection } | null {
  const trimmed = raw.trim();
  const m = SORT_TOKEN_PATTERN.exec(trimmed);
  if (!m) {
    return null;
  }
  const field = m[1];
  const direction = m[2];
  if (field === undefined || direction === undefined) {
    return null;
  }
  return { field, direction: direction as SortDirection };
}

/**
 * Typical default when a list omits `sort`: newest documents first by `createdAt`.
 * Pass as the third argument to {@link mongoSortFromSortQuery} when that matches the route’s documented default.
 */
export const DEFAULT_MONGO_SORT_CREATED_AT_DESC = { createdAt: -1 } as const satisfies Record<
  string,
  1 | -1
>;

/**
 * Validates one non-empty `field:asc|desc` string (no field whitelist).
 * Use {@link sortQuerySchema} on list endpoints so only allowed fields pass.
 */
export const sortParamSchema = z.string().superRefine((val, ctx) => {
  if (!parseSortToken(val)) {
    ctx.addIssue({
      code: "custom",
      message: 'Expected "field:asc" or "field:desc" (example: createdAt:desc)',
    });
  }
});

function coalesceExpressQuerySort(val: unknown): unknown {
  if (val === undefined || val === "") {
    return undefined;
  }
  if (typeof val === "string") {
    const t = val.trim();
    return t === "" ? undefined : t;
  }
  if (Array.isArray(val) && typeof val[0] === "string") {
    const t = val[0].trim();
    return t === "" ? undefined : t;
  }
  return val;
}

/**
 * Standard list query fragment: optional `sort=field:direction`.
 * Whitelists `allowedFields` for predictable API surface and safe DB mapping.
 */
export function sortQuerySchema(allowedFields: readonly [string, ...string[]]) {
  const allowedCsv = allowedFields.join(", ");
  const primaryField = allowedFields[0];
  const exampleDesc = `${primaryField}:desc`;
  const exampleAsc = `${primaryField}:asc`;
  const openApiDescription = [
    "Query `sort` format: `field:asc` or `field:desc` (lowercase `asc`/`desc` only; one field per request).",
    `Only these field names are accepted (whitelist); anything else is a validation error: ${allowedCsv}.`,
    "If `sort` is omitted or empty, the operation uses its documented default order (not necessarily the same as one of the examples).",
    "Server maps this to MongoDB `.sort()` on that single field: `asc` → 1, `desc` → -1.",
    `Examples: ${exampleDesc}, ${exampleAsc}.`,
  ].join(" ");
  return z.object({
    sort: z.preprocess(
      coalesceExpressQuerySort,
      z
        .string()
        .optional()
        .superRefine((val, ctx) => {
          if (val === undefined || val.trim() === "") {
            return;
          }
          const parsed = parseSortToken(val);
          if (!parsed) {
            ctx.addIssue({
              code: "custom",
              message: `Invalid sort format. Use field:asc or field:desc (e.g. ${exampleDesc}).`,
            });
            return;
          }
          if (!allowedFields.includes(parsed.field)) {
            ctx.addIssue({
              code: "custom",
              message: `Invalid sort field. Allowed: ${allowedCsv}`,
            });
          }
        })
        .openapi({
          description: openApiDescription,
          example: exampleDesc,
        }),
    ),
  });
}

/**
 * Converts optional `sort` query string into a MongoDB sort spec (single field).
 * Call with the same `allowedFields` and default as the route's {@link sortQuerySchema}.
 */
export function mongoSortFromSortQuery(
  sort: string | undefined,
  allowedFields: readonly string[],
  defaultSort: Record<string, 1 | -1>,
): Record<string, 1 | -1> {
  const parsed = sort === undefined || sort.trim() === "" ? null : parseSortToken(sort);
  if (parsed === null || !allowedFields.includes(parsed.field)) {
    return { ...defaultSort };
  }
  const n = parsed.direction === "asc" ? 1 : -1;
  return { [parsed.field]: n };
}
