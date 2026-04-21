import type { RequestHandler } from "express";
import { env } from "../../config/env.js";

/** Sets `X-API-Version` for all responses under the versioned API router. */
export const apiVersionHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader("X-API-Version", env.apiVersion);
  next();
};
