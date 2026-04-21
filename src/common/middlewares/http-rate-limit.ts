import rateLimit from "express-rate-limit";
import type { Store } from "express-rate-limit";
import { env } from "../../config/env.js";

function rateLimitSkip(req: { path: string }): boolean {
  return (
    req.path === "/health" ||
    req.path.startsWith("/health/") ||
    req.path === "/docs" ||
    req.path.startsWith("/docs/") ||
    req.path === "/metrics"
  );
}

/**
 * Global HTTP rate limiter. When **`store`** is omitted, uses the default in-memory store
 * (per process) — allowed only in non-production via **`env`** (production requires
 * **`RATE_LIMIT_REDIS_URL`**). Pass a **Redis** {@link Store} from {@link connectRateLimitRedis}
 * for shared counters across replicas.
 */
export function createHttpRateLimiter(store?: Store) {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: rateLimitSkip,
    ...(store !== undefined ? { store } : {}),
  });
}
