import type { IncomingMessage } from "node:http";

/**
 * Client IP for telemetry when `trustProxy` matches Express `app.set("trust proxy", ...)`.
 * Uses the leftmost `X-Forwarded-For` hop (typical single reverse proxy / CDN) when trust is on.
 */
export function clientIpForTelemetry(
  req: IncomingMessage,
  trustProxy: boolean | number,
): string | undefined {
  const trustEnabled = trustProxy !== false;
  if (trustEnabled) {
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string") {
      const first = xff.split(",")[0]?.trim();
      if (first !== undefined && first.length > 0) {
        return first;
      }
    }
    const xReal = req.headers["x-real-ip"];
    if (typeof xReal === "string") {
      const t = xReal.trim();
      if (t.length > 0) {
        return t;
      }
    }
  }
  return req.socket.remoteAddress;
}
