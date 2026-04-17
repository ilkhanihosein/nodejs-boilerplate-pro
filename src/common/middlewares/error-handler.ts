import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "../errors/app-error.js";
import { logger } from "../logger.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  void next;
  if (res.headersSent) {
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      code: "validation_error",
      details: err.issues,
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: "Invalid identifier", code: "bad_request" });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.keys(err.errors);
    res.status(422).json({
      error: "Validation failed",
      code: "validation_error",
      fields,
    });
    return;
  }

  if (isMongoDuplicateKeyError(err)) {
    res.status(409).json({ error: "Resource already exists", code: "conflict" });
    return;
  }

  logger.error({ err, reqId: req.id }, "unhandled_error");
  const message =
    env.nodeEnv === "production"
      ? "Internal Server Error"
      : err instanceof Error
        ? err.message
        : "Error";
  res.status(500).json({ error: message, code: "internal_error" });
};

function isMongoDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 11_000
  );
}
