import { OpenApiGeneratorV3, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas30";
import { env } from "../../config/env.js";
import { authEndpointRegistry } from "../../modules/auth/auth.endpoints.js";
import { healthEndpointRegistry } from "../../modules/health/health.endpoints.js";
import { usersEndpointRegistry } from "../../modules/users/users.endpoints.js";
import { v1PublicEndpointRegistry } from "./v1-public.endpoints.js";

/** OpenAPI 3 document: every path comes from `HttpEndpointRegistry` + `definePublicEndpoint` / `defineProtectedEndpoint` (no hand-written paths). */
export function buildOpenApiV1Document(): OpenAPIObject {
  const registry = new OpenAPIRegistry();

  registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  healthEndpointRegistry.contributeOpenApi(registry);
  v1PublicEndpointRegistry.contributeOpenApi(registry);
  authEndpointRegistry.contributeOpenApi(registry);
  usersEndpointRegistry.contributeOpenApi(registry);

  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "HTTP API",
      version: env.apiVersion,
      description:
        "Generated from Zod via @asteasolutions/zod-to-openapi. Routes are declared with `definePublicEndpoint` / `defineProtectedEndpoint` (see `src/common/http/define-endpoint.ts`) so request validation and OpenAPI stay aligned.",
    },
    servers: [{ url: "/", description: "Same host as the API (see paths)." }],
  });
}
