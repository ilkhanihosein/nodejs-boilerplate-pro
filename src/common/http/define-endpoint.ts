import type { OpenAPIRegistry, RouteConfig } from "@asteasolutions/zod-to-openapi";
import type { Request, RequestHandler } from "express";
import type { ZodObject, ZodType } from "zod";
import type { z } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import { requireAuth } from "../middlewares/auth.js";
import type { ValidateRequestParts } from "../middlewares/validate-request.js";
import { buildValidatedBagFromRequest, type ValidatedBag } from "./endpoint-validated.js";

export type { ValidatedBag } from "./endpoint-validated.js";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export type ResponseSpec = { description: string; schema: ZodType };

export type EndpointAuthMode = "public" | "protected";

/**
 * Validates `data` with `responses[status].schema`, sends JSON, and **terminates the handler’s
 * success path** (return type is `never`). Do not write code after `json(...)` on that path.
 */
export type EndpointJson<R extends Record<number, ResponseSpec>> = <C extends keyof R & number>(
  status: C,
  data: z.infer<R[C]["schema"]>,
) => never;

type SharedEndpointFields<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
  R extends Record<number, ResponseSpec>,
> = {
  method: HttpMethod;
  /** Express path on the router this endpoint mounts to (e.g. `/hello`, `/:id`). */
  path: string;
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Array<Record<string, string[]>>;
  request?: {
    params?: P;
    query?: Q;
    body?: B;
  };
  responses: R;
};

export type PublicEndpointHandlerContext<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
  R extends Record<number, ResponseSpec>,
> = {
  req: Request;
  validated: ValidatedBag<P, Q, B>;
  json: EndpointJson<R>;
};

export type ProtectedEndpointHandlerContext<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
  R extends Record<number, ResponseSpec>,
> = {
  req: AuthenticatedRequest;
  validated: ValidatedBag<P, Q, B>;
  json: EndpointJson<R>;
};

export type DefinePublicEndpointConfig<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
  R extends Record<number, ResponseSpec>,
> = SharedEndpointFields<P, Q, B, R> & {
  middlewares?: readonly RequestHandler[];
  handler: (ctx: PublicEndpointHandlerContext<P, Q, B, R>) => void | Promise<void>;
};

export type DefineProtectedEndpointConfig<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
  R extends Record<number, ResponseSpec>,
> = SharedEndpointFields<P, Q, B, R> & {
  /**
   * Middleware that runs after bearer auth (e.g. `requireRole("admin")`).
   * Do not pass `requireAuth` here — it is always applied first automatically.
   */
  middlewares?: readonly RequestHandler[];
  handler: (ctx: ProtectedEndpointHandlerContext<P, Q, B, R>) => void | Promise<void>;
};

export type EndpointDefinition = {
  readonly authMode: EndpointAuthMode;
  readonly method: HttpMethod;
  readonly expressPath: string;
  readonly middlewares: RequestHandler[];
  readonly validateParts: ValidateRequestParts | undefined;
  readonly expressHandler: RequestHandler;
  readonly registerOpenApi: (registry: OpenAPIRegistry, openApiBasePath: string) => void;
};

/** Narrow `Request` → `AuthenticatedRequest` after `requireAuth` (only cast site; Express typings keep `authUser` optional). */
function asAuthenticatedRequest(req: Request): AuthenticatedRequest {
  if (req.authUser === undefined) {
    throw new Error(
      "Expected req.authUser before protected endpoint handler (requireAuth must run first).",
    );
  }
  return req as AuthenticatedRequest;
}

function assertProtectedMiddlewaresInvariant(
  middlewares: RequestHandler[],
  expressPath: string,
): void {
  if (middlewares.length === 0 || middlewares[0] !== requireAuth) {
    throw new Error(
      `[defineProtectedEndpoint] Invariant failed for ${expressPath}: requireAuth must be first middleware.`,
    );
  }
}

function buildValidateParts<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
>(
  request: SharedEndpointFields<P, Q, B, Record<number, ResponseSpec>>["request"],
): ValidateRequestParts | undefined {
  if (!request) {
    return undefined;
  }
  const parts: ValidateRequestParts = {};
  if (request.body !== undefined) {
    parts.body = request.body;
  }
  if (request.query !== undefined) {
    parts.query = request.query;
  }
  if (request.params !== undefined) {
    parts.params = request.params;
  }
  return Object.keys(parts).length > 0 ? parts : undefined;
}

function toOpenApiRequest<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
>(
  request: SharedEndpointFields<P, Q, B, Record<number, ResponseSpec>>["request"],
): RouteConfig["request"] | undefined {
  if (!request) {
    return undefined;
  }
  const r: NonNullable<RouteConfig["request"]> = {};
  if (request.params !== undefined) {
    r.params = request.params as ZodObject;
  }
  if (request.query !== undefined) {
    r.query = request.query as ZodObject;
  }
  if (request.body !== undefined) {
    r.body = {
      content: {
        "application/json": {
          schema: request.body,
        },
      },
    };
  }
  return Object.keys(r).length > 0 ? r : undefined;
}

function toOpenApiResponses(responses: Record<number, ResponseSpec>): RouteConfig["responses"] {
  const out: RouteConfig["responses"] = {};
  for (const [code, spec] of Object.entries(responses)) {
    out[code] = {
      description: spec.description,
      content: {
        "application/json": {
          schema: spec.schema,
        },
      },
    };
  }
  return out;
}

/** Join OpenAPI base (e.g. `/api/v1/users`) and Express-relative path (`/:id` → `/{id}`). */
export function joinOpenApiPath(openApiBasePath: string, expressRelativePath: string): string {
  const base = openApiBasePath.replace(/\/$/, "") || "";
  const rel = expressRelativePath.startsWith("/") ? expressRelativePath : `/${expressRelativePath}`;
  const converted = rel.replace(/:([^/]+)/g, "{$1}");
  if (rel === "/") {
    return base || "/";
  }
  return `${base}${converted}`;
}

function createEndpointDefinition<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
  R extends Record<number, ResponseSpec>,
>(
  authMode: EndpointAuthMode,
  middlewares: RequestHandler[],
  config: {
    method: HttpMethod;
    path: string;
    summary?: string;
    description?: string;
    tags?: string[];
    security?: Array<Record<string, string[]>>;
    request?: SharedEndpointFields<P, Q, B, R>["request"];
    responses: R;
    handler: (ctx: {
      req: Request;
      validated: ValidatedBag<P, Q, B>;
      json: EndpointJson<R>;
    }) => void | Promise<void>;
  },
): EndpointDefinition {
  const validateParts = buildValidateParts(config.request);

  const expressHandler: RequestHandler = async (req, res, next) => {
    try {
      const validated = buildValidatedBagFromRequest(req, config.request);
      const json: EndpointJson<R> = (status, data): never => {
        const entry = config.responses[status];
        if (!entry) {
          throw new Error(`No response schema for status ${String(status)}`);
        }
        const parsed = entry.schema.parse(data);
        res.status(status).json(parsed);
        return undefined as never;
      };
      await config.handler({ req, validated, json });
    } catch (err) {
      next(err);
    }
  };

  return {
    authMode,
    method: config.method,
    expressPath: config.path,
    middlewares,
    validateParts,
    expressHandler,
    registerOpenApi: (registry, openApiBasePath) => {
      const path = joinOpenApiPath(openApiBasePath, config.path);
      const route = {
        method: config.method,
        path,
        responses: toOpenApiResponses(config.responses as Record<number, ResponseSpec>),
        ...(config.summary !== undefined ? { summary: config.summary } : {}),
        ...(config.description !== undefined ? { description: config.description } : {}),
        ...(config.tags !== undefined ? { tags: config.tags } : {}),
        ...(config.security !== undefined ? { security: config.security } : {}),
        ...(() => {
          const req = toOpenApiRequest(config.request);
          return req !== undefined ? { request: req } : {};
        })(),
      } as RouteConfig;
      registry.registerPath(route);
    },
  };
}

export function definePublicEndpoint<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
  R extends Record<number, ResponseSpec>,
>(config: DefinePublicEndpointConfig<P, Q, B, R>): EndpointDefinition {
  const middlewares = [...(config.middlewares ?? [])];
  return createEndpointDefinition("public", middlewares, {
    method: config.method,
    path: config.path,
    responses: config.responses,
    handler: config.handler,
    ...(config.summary !== undefined ? { summary: config.summary } : {}),
    ...(config.description !== undefined ? { description: config.description } : {}),
    ...(config.tags !== undefined ? { tags: config.tags } : {}),
    ...(config.security !== undefined ? { security: config.security } : {}),
    ...(config.request !== undefined ? { request: config.request } : {}),
  });
}

export function defineProtectedEndpoint<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
  R extends Record<number, ResponseSpec>,
>(config: DefineProtectedEndpointConfig<P, Q, B, R>): EndpointDefinition {
  for (const m of config.middlewares ?? []) {
    if (m === requireAuth) {
      throw new Error(
        "defineProtectedEndpoint: do not pass `requireAuth` in `middlewares` — it is injected automatically.",
      );
    }
  }
  const middlewares = [requireAuth, ...(config.middlewares ?? [])];
  assertProtectedMiddlewaresInvariant(middlewares, config.path);
  return createEndpointDefinition("protected", middlewares, {
    method: config.method,
    path: config.path,
    responses: config.responses,
    handler: ({ req, validated, json }) =>
      config.handler({
        req: asAuthenticatedRequest(req),
        validated,
        json,
      }),
    ...(config.summary !== undefined ? { summary: config.summary } : {}),
    ...(config.description !== undefined ? { description: config.description } : {}),
    ...(config.tags !== undefined ? { tags: config.tags } : {}),
    ...(config.security !== undefined ? { security: config.security } : {}),
    ...(config.request !== undefined ? { request: config.request } : {}),
  });
}
