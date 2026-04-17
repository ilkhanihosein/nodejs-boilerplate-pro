import type { RequestHandler } from "express";
import { runWithContext } from "../context/request-context.js";
import { ensureRequestId } from "./request-id.js";

/**
 * Records wall time for duration metrics, assigns `requestId` (`req.id` + `X-Request-Id`),
 * and binds AsyncLocalStorage. Must run before `httpLogger` and `requestLifecycleLogger`.
 */
export const bindRequestContext: RequestHandler = (req, res, next) => {
  req.requestStartedAtMs = Date.now();
  const requestId = ensureRequestId(req, res);
  runWithContext(requestId, () => {
    next();
  });
};
