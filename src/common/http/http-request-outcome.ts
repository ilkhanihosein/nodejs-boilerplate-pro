import type { ServerResponse } from "node:http";

/** Mirrors Prometheus `status_type` labels (`http_requests_total`, histogram) and tracing. */
export type HttpRequestOutcomeStatusType = "completed" | "aborted";

/**
 * Single rule, shared by metrics and tracing: **`aborted`** iff the response never finished writing.
 */
export function httpOutcomeAtResponseClose(response: ServerResponse): HttpRequestOutcomeStatusType {
  return response.writableEnded ? "completed" : "aborted";
}
