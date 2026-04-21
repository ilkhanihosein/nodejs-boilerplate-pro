import { context, trace } from "@opentelemetry/api";
import pino from "pino";
import type { LevelWithSilent, Logger } from "pino";
import { getRequestId } from "./context/request-context.js";
import { env } from "../config/env.js";

const validLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

function isValidLevel(level: string): level is LevelWithSilent {
  return (validLevels as readonly string[]).includes(level);
}

const level: LevelWithSilent = isValidLevel(env.logLevel)
  ? env.logLevel
  : env.nodeEnv === "production"
    ? "info"
    : "debug";

const rootLogger = pino({
  level,
  base: {
    pid: process.pid,
    env: env.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.token",
    ],
    remove: true,
  },
});

/** Root pino instance passed to `pino-http`. Prefer `getLogger()` for application code. */
export const logger = rootLogger;

const INVALID_TRACE_ID = "00000000000000000000000000000000";

let warnedTracingNoActiveSpan = false;

function warnTracingNoActiveSpanOnce(): void {
  if (warnedTracingNoActiveSpan) {
    return;
  }
  warnedTracingNoActiveSpan = true;
  rootLogger.warn(
    { event: "otel_no_active_span_context", oncePerProcess: true },
    "tracing_enabled_but_no_active_span_context",
  );
}

type TraceCorrelationFields =
  | { traceId: string; spanId: string; otelSpan: "ok" }
  | { traceId: "missing"; spanId: "missing"; otelSpan: "no_active_span" };

/**
 * When tracing is enabled, every log line carries `traceId` + `spanId` for correlation.
 * If there is no active recording span (e.g. unsampled root), fields are explicit sentinels — never silent.
 */
function traceCorrelationFields(): TraceCorrelationFields | undefined {
  if (!env.observabilityTracingEnabled) {
    return undefined;
  }
  const span = trace.getSpan(context.active());
  if (span === undefined) {
    warnTracingNoActiveSpanOnce();
    return { traceId: "missing", spanId: "missing", otelSpan: "no_active_span" };
  }
  const sc = span.spanContext();
  if (sc.traceId === INVALID_TRACE_ID) {
    warnTracingNoActiveSpanOnce();
    return { traceId: "missing", spanId: "missing", otelSpan: "no_active_span" };
  }
  return { traceId: sc.traceId, spanId: sc.spanId, otelSpan: "ok" };
}

/**
 * Application logger: after `bindRequestContext`, binds `requestId` from AsyncLocalStorage
 * so it matches access and error logs. When tracing is enabled, always binds `traceId` / `spanId`
 * (or explicit `missing` + `otelSpan` when no active span).
 */
export function getLogger(): Logger {
  const requestId = getRequestId();
  const traceFields = traceCorrelationFields();
  if (requestId === undefined && traceFields === undefined) {
    return rootLogger;
  }
  return rootLogger.child({
    ...(requestId !== undefined ? { requestId } : {}),
    ...traceFields,
  });
}
