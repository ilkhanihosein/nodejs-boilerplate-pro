import type { Request, RequestHandler, Response } from "express";
import { pinoHttp } from "pino-http";
import { getLogger, logger } from "../logger.js";
import { httpRequestCompleteFields, httpRequestLogBase } from "../logging/http-request-log.js";
import { ensureRequestId } from "./request-id.js";

/**
 * `pino-http` for `genReqId` / `req.id` only — no auto response logging (avoids duplicate lines
 * with `errorHandler`). Use `requestLifecycleLogger` for start/complete access lines.
 */
export const httpLogger = pinoHttp({
  logger,
  autoLogging: false,
  quietReqLogger: true,
  quietResLogger: true,
  genReqId(req: Request, res: Response) {
    return ensureRequestId(req, res);
  },
});

/** Structured request start + complete (no error payloads; those go to `errorHandler`). */
export const requestLifecycleLogger: RequestHandler = (req, res, next) => {
  const base = httpRequestLogBase(req);
  getLogger().info({ ...base, phase: "start" }, `${base.method} ${base.path} started`);

  let logged = false;
  const onComplete = () => {
    if (logged) {
      return;
    }
    logged = true;
    res.removeListener("finish", onComplete);
    res.removeListener("close", onComplete);
    const started = req.requestStartedAtMs;
    const durationMs = typeof started === "number" ? Date.now() - started : 0;
    const fields = httpRequestCompleteFields(req, res, durationMs);
    const access = getLogger();
    if (res.statusCode >= 400 && res.statusCode < 500) {
      access.warn(fields, `${fields.method} ${fields.path} completed`);
    } else {
      access.info(fields, `${fields.method} ${fields.path} completed`);
    }
  };

  res.on("finish", onComplete);
  res.on("close", onComplete);
  next();
};
