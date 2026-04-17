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
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Read `req.validated.*` after `validateRequest` ran on the same route.
 * Values stay `unknown` until callers narrow with `z.infer<typeof schema>` (or similar).
 */
export function requireValidatedBody(req: Request): unknown {
  const body = req.validated?.body;
  if (body === undefined) {
    throw new Error("Missing validated body");
  }
  return body;
}

export function requireValidatedQuery(req: Request): unknown {
  const query = req.validated?.query;
  if (query === undefined) {
    throw new Error("Missing validated query");
  }
  return query;
}

export function requireValidatedParams(req: Request): unknown {
  const params = req.validated?.params;
  if (params === undefined) {
    throw new Error("Missing validated params");
  }
  return params;
}
