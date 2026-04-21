import { OpenApiGeneratorV3, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas30";
import { env } from "../../config/env.js";
import { httpContractRegistries } from "./contract-registries.js";

/** OpenAPI 3 document: every path comes from `HttpEndpointRegistry` + `definePublicEndpoint` / `defineProtectedEndpoint` (no hand-written paths). */
export function buildOpenApiV1Document(): OpenAPIObject {
  const registry = new OpenAPIRegistry();

  registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  for (const r of httpContractRegistries) {
    r.contributeOpenApi(registry);
  }

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
