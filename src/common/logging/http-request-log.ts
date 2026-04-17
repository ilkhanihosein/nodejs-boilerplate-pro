import type { Request, Response } from "express";

export const HTTP_REQUEST_EVENT = "http_request" as const;

/** Common HTTP log fields (correlation id comes from `getLogger()` child bindings, not duplicated here). */
export function httpRequestLogBase(req: Request) {
  return {
    event: HTTP_REQUEST_EVENT,
    method: req.method,
    path: req.originalUrl,
  };
}

export function httpRequestCompleteFields(req: Request, res: Response, durationMs: number) {
  return {
    ...httpRequestLogBase(req),
    phase: "complete" as const,
    statusCode: res.statusCode,
    durationMs,
  };
}
