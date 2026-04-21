import { z } from "zod";

/** Matches `errorHandler` output for `ZodError`. */
export const validationErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  apiVersion: z.string(),
  details: z.array(z.unknown()),
});

/** Matches typical `AppError` JSON (and similar client-facing errors). */
export const appErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  apiVersion: z.string(),
});
