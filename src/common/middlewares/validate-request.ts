import type { Request, RequestHandler } from "express";
import type { z } from "zod";

export type ValidateRequestParts = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

/**
 * Parses slices with Zod. On success stores results on `req.validated` (Express 5
 * makes `req.query` read-only — do not assign back to `req.query` / `req.params`).
 * On failure passes `ZodError` to `next` for `error-handler`.
 */
export function validateRequest(parts: ValidateRequestParts): RequestHandler {
  return (req, _res, next) => {
    try {
      req.validated ??= {};
      if (parts.body !== undefined) {
        req.validated.body = parts.body.parse(req.body);
      }
      if (parts.query !== undefined) {
        req.validated.query = parts.query.parse(req.query);
      }
      if (parts.params !== undefined) {
        req.validated.params = parts.params.parse(req.params);
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

function readValidatedBody(req: Request): unknown {
  const validated = req.validated;
  if (validated === undefined || validated.body === undefined) {
    throw new Error(
      "Missing validated body (add validateRequest with a body schema before this handler)",
    );
  }
  return validated.body;
}

function readValidatedQuery(req: Request): unknown {
  const validated = req.validated;
  if (validated === undefined || validated.query === undefined) {
    throw new Error(
      "Missing validated query (add validateRequest with a query schema before this handler)",
    );
  }
  return validated.query;
}

function readValidatedParams(req: Request): unknown {
  const validated = req.validated;
  if (validated === undefined || validated.params === undefined) {
    throw new Error(
      "Missing validated params (add validateRequest with a params schema before this handler)",
    );
  }
  return validated.params;
}

/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters -- `T` is supplied at call sites as `z.infer<typeof schema>` */
/** Read `req.validated.body` after `validateRequest({ body: … })`. */
export function requireValidatedBody<T>(req: Request): T {
  return readValidatedBody(req) as T;
}

/** Read `req.validated.query` after `validateRequest({ query: … })`. */
export function requireValidatedQuery<T>(req: Request): T {
  return readValidatedQuery(req) as T;
}

/** Read `req.validated.params` after `validateRequest({ params: … })`. */
export function requireValidatedParams<T>(req: Request): T {
  return readValidatedParams(req) as T;
}
/* eslint-enable @typescript-eslint/no-unnecessary-type-parameters */
