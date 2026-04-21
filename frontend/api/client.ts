import createClient from "openapi-fetch";
import type { paths } from "../../generated/api-types.js";

/** Re-export of the generated OpenAPI `paths` map (single source of truth). */
export type OpenApiPaths = paths;

/** Typed `openapi-fetch` client: paths and methods come only from generated `paths`. */
export type OpenApiHttpClient = ReturnType<typeof createClient<paths>>;

export type CreateOpenApiClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
};

/**
 * Low-level HTTP client: every path and body type is derived from `generated/api-types.ts`.
 * Prefer {@link createApi} for domain-shaped access (`api.auth.login`, …).
 */
export function createOpenApiClient(options: CreateOpenApiClientOptions): OpenApiHttpClient {
  return options.fetch !== undefined
    ? createClient<paths>({ baseUrl: options.baseUrl, fetch: options.fetch })
    : createClient<paths>({ baseUrl: options.baseUrl });
}
