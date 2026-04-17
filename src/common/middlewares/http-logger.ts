import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import type { LevelWithSilent } from "pino";
import { pinoHttp } from "pino-http";
import { logger } from "../logger.js";

function readIncomingRequestId(req: Request): string | undefined {
  const raw = req.headers["x-request-id"];
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

export const httpLogger = pinoHttp({
  logger,
  autoLogging: true,
  genReqId(req: Request, res: Response) {
    const id = readIncomingRequestId(req) ?? randomUUID();
    req.id = id;
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel(_req: Request, res: Response, err?: Error): LevelWithSilent {
    if (res.statusCode >= 500 || err) {
      return "error";
    }
    if (res.statusCode >= 400) {
      return "warn";
    }
    return "info";
  },
  customSuccessMessage(req: Request, res: Response) {
    void res;
    return `${req.method} ${req.url} completed`;
  },
  customErrorMessage(req: Request, res: Response, err: Error) {
    void res;
    return `${req.method} ${req.url} failed: ${err.message}`;
  },
});
