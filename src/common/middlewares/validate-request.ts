import type { RequestHandler } from "express";
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
