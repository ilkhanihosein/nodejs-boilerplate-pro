import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

export function readIncomingRequestId(req: Request): string | undefined {
  const raw = req.headers["x-request-id"];
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

/** Sets `req.id`, echoes `X-Request-Id`, returns the id (idempotent if already set). */
export function ensureRequestId(req: Request, res: Response): string {
  if (typeof req.id === "string" && req.id.length > 0) {
    res.setHeader("X-Request-Id", req.id);
    return req.id;
  }
  const id = readIncomingRequestId(req) ?? randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  return id;
}
