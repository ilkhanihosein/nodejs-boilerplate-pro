import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";

export const httpRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === "/health" ||
    req.path.startsWith("/health/") ||
    req.path === "/docs" ||
    req.path.startsWith("/docs/") ||
    req.path === "/metrics",
});
