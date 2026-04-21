import type { Request, RequestHandler, Response } from "express";
import {
  beginHttpRequestInFlight,
  endHttpRequestInFlight,
  recordHttpRequestMetrics,
} from "../../../observability/metrics.js";
import { httpOutcomeAtResponseClose } from "../http-request-outcome.js";
import { resolveHttpRoute } from "../http-route-label.js";

export type HttpMetricsStatusType = "completed" | "aborted";

function normalizeMethod(req: Request): string {
  return typeof req.method === "string" ? req.method.toUpperCase() : "UNKNOWN";
}

/**
 * One lifecycle: **request start → first `finish` or `close` → record once**.
 *
 * - In-flight: **`inc`** right after **`/metrics`** skip, **`dec`** in the same **`recordOnce`** path as metrics.
 * - Counter + histogram: **`resolveHttpRoute(req)`** at record time (same function as tracing **`http.route`**).
 */
export const httpMetricsMiddleware: RequestHandler = (req: Request, res: Response, next) => {
  if (req.path === "/metrics") {
    next();
    return;
  }

  const method = normalizeMethod(req);
  const start = process.hrtime.bigint();
  let recorded = false;

  function recordOnce(): void {
    if (recorded) {
      return;
    }
    recorded = true;
    res.removeListener("close", recordOnce);
    res.removeListener("finish", recordOnce);

    endHttpRequestInFlight(method);

    const elapsedNs = process.hrtime.bigint() - start;
    const durationSeconds = Number(elapsedNs) / 1e9;
    const statusType = httpOutcomeAtResponseClose(res);
    recordHttpRequestMetrics({
      method,
      route: resolveHttpRoute(req),
      statusCode: res.statusCode,
      durationSeconds,
      statusType,
    });
  }

  beginHttpRequestInFlight(method);
  res.on("close", recordOnce);
  res.on("finish", recordOnce);

  next();
};

export { httpMetricsRouteLabel, resolveHttpRoute } from "../http-route-label.js";
