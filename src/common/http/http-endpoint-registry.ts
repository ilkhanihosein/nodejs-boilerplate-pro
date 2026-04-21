import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import type { RequestHandler, Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate-request.js";
import { joinOpenApiPath, type EndpointDefinition, type HttpMethod } from "./define-endpoint.js";

/**
 * Groups endpoints that share the same OpenAPI path prefix (e.g. `/api/v1` or `/api/v1/users`).
 * Mount on an Express `Router`, then contribute paths to a shared `OpenAPIRegistry`.
 */
function assertProtectedAuthChain(ep: EndpointDefinition): void {
  if (ep.authMode !== "protected") {
    return;
  }
  if (ep.middlewares.length === 0 || ep.middlewares[0] !== requireAuth) {
    throw new Error(
      `[HttpEndpointRegistry] Protected endpoint ${ep.method.toUpperCase()} ${ep.expressPath} must list requireAuth as the first middleware (use defineProtectedEndpoint).`,
    );
  }
}

export class HttpEndpointRegistry {
  private readonly endpoints: EndpointDefinition[] = [];

  constructor(private readonly openApiBasePath: string) {}

  add(...defs: EndpointDefinition[]): this {
    for (const d of defs) {
      assertProtectedAuthChain(d);
      this.endpoints.push(d);
    }
    return this;
  }

  mount(router: Router): void {
    for (const ep of this.endpoints) {
      const chain: RequestHandler[] = [...ep.middlewares];
      if (ep.validateParts !== undefined && Object.keys(ep.validateParts).length > 0) {
        chain.push(validateRequest(ep.validateParts));
      }
      chain.push(ep.expressHandler);
      mountMethod(router, ep.method, ep.expressPath, chain);
    }
  }

  contributeOpenApi(registry: OpenAPIRegistry): void {
    const base = this.openApiBasePath.replace(/\/$/, "") || "";
    for (const ep of this.endpoints) {
      ep.registerOpenApi(registry, base);
    }
  }

  /** Full OpenAPI path + HTTP method for every mounted endpoint (used by contract CI). */
  listOperations(): ReadonlyArray<{ method: HttpMethod; path: string }> {
    const base = this.openApiBasePath.replace(/\/$/, "") || "";
    return this.endpoints.map((ep) => ({
      method: ep.method,
      path: joinOpenApiPath(base, ep.expressPath),
    }));
  }
}

function mountMethod(
  router: Router,
  method: HttpMethod,
  path: string,
  handlers: RequestHandler[],
): void {
  switch (method) {
    case "get":
      router.get(path, ...handlers);
      break;
    case "post":
      router.post(path, ...handlers);
      break;
    case "put":
      router.put(path, ...handlers);
      break;
    case "patch":
      router.patch(path, ...handlers);
      break;
    case "delete":
      router.delete(path, ...handlers);
      break;
    default: {
      const _exhaustive: never = method;
      throw new Error(`Unsupported method: ${String(_exhaustive)}`);
    }
  }
}
