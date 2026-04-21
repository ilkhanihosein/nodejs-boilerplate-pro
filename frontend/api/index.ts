import type { MaybeOptionalInit } from "openapi-fetch";
import type { OpenApiHttpClient } from "./client.js";
import { createOpenApiClient } from "./client.js";
import type { paths } from "../../generated/api-types.js";

export type { OpenApiHttpClient, OpenApiPaths } from "./client.js";
export { createOpenApiClient } from "./client.js";

type GetInit<Path extends keyof paths> = MaybeOptionalInit<paths[Path], "get">;
type PostInit<Path extends keyof paths> = MaybeOptionalInit<paths[Path], "post">;
type PatchInit<Path extends keyof paths> = MaybeOptionalInit<paths[Path], "patch">;

export type CreateApiOptions = {
  baseUrl: string;
  /**
   * When provided, registers middleware that sets `Authorization: Bearer <token>`
   * on each request whenever the function returns a non-empty string.
   */
  getAccessToken?: () => string | undefined;
  fetch?: typeof fetch;
};

/**
 * Domain API grouped like OpenAPI tags: `api.auth.login`, `api.users.list`, `api.health`, `api.v1`.
 * All request/response shapes are inferred from the generated OpenAPI types (no hand-written DTOs).
 *
 * Path literals below match `keyof paths` from `openapi:generate` (default `API_V1_PREFIX` is `/api/v1`).
 * If you use a custom prefix, regenerate types and update these strings, or call `api.client` with the new path keys.
 */
export function createApi(options: CreateApiOptions) {
  const client: OpenApiHttpClient =
    options.fetch !== undefined
      ? createOpenApiClient({ baseUrl: options.baseUrl, fetch: options.fetch })
      : createOpenApiClient({ baseUrl: options.baseUrl });

  if (options.getAccessToken !== undefined) {
    const getAccessToken = options.getAccessToken;
    client.use({
      onRequest({ request }) {
        const token = getAccessToken();
        if (token !== undefined && token !== "") {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    });
  }

  return {
    /**
     * OpenAPI tag **Health** — liveness and readiness probes.
     */
    health: {
      liveness: () => client.GET("/health"),
      readiness: () => client.GET("/health/ready"),
    },
    /**
     * OpenAPI tag **API v1** — version index and sample hello route.
     */
    v1: {
      index: () => client.GET("/api/v1"),
      hello: (init: GetInit<"/api/v1/hello">) => client.GET("/api/v1/hello", init),
    },
    /**
     * OpenAPI tag **Auth** — register, login, refresh, logout, current user.
     */
    auth: {
      register: (init: PostInit<"/api/v1/auth/register">) =>
        client.POST("/api/v1/auth/register", init),
      login: (init: PostInit<"/api/v1/auth/login">) => client.POST("/api/v1/auth/login", init),
      refresh: (init: PostInit<"/api/v1/auth/refresh">) =>
        client.POST("/api/v1/auth/refresh", init),
      logout: (init: PostInit<"/api/v1/auth/logout">) => client.POST("/api/v1/auth/logout", init),
      me: (init?: GetInit<"/api/v1/auth/me">) => client.GET("/api/v1/auth/me", init),
    },
    /**
     * OpenAPI tag **Users** — admin user management.
     */
    users: {
      list: (init?: GetInit<"/api/v1/users">) => client.GET("/api/v1/users", init),
      getById: (init: GetInit<"/api/v1/users/{id}">) => client.GET("/api/v1/users/{id}", init),
      updateRole: (init: PatchInit<"/api/v1/users/{id}/role">) =>
        client.PATCH("/api/v1/users/{id}/role", init),
    },
    /** Same typed client, for advanced or future routes without a domain alias yet. */
    client,
  };
}

export type ApiClient = ReturnType<typeof createApi>;
