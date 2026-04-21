import type { Express } from "express";
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import { env } from "../config/env.js";

const register = new Registry();

const httpMetricLabelNames = [
  "method",
  "route",
  "status_code",
  "status_type",
  "error_type",
  "is_error",
] as const;

const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total count of HTTP responses (completed or aborted)",
  labelNames: [...httpMetricLabelNames],
  registers: [register],
});

/**
 * Histogram buckets (seconds): tuned for typical JSON API latency on LAN/cloud.
 * - 5–100ms: fast cache / tiny payloads
 * - 100–300ms: common DB-backed handlers
 * - 300ms–1s: heavier queries / fan-out
 * - 1–5s: slow paths / cold starts (still bounded for SLO-style dashboards)
 * Omitting sub-5ms buckets reduces noise from scrape/timer overhead while keeping headroom for SLIs.
 */
const HTTP_DURATION_BUCKETS_S = [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 2, 5] as const;

const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds from first middleware to response finish or connection close",
  labelNames: [...httpMetricLabelNames],
  buckets: [...HTTP_DURATION_BUCKETS_S],
  registers: [register],
});

const httpMetricInFlightLabelNames = ["method"] as const;

const httpRequestsInFlight = new Gauge({
  name: "http_requests_in_flight",
  help: "Number of HTTP requests currently being processed (by method only)",
  labelNames: [...httpMetricInFlightLabelNames],
  registers: [register],
});

let initialized = false;

export function initPrometheusMetrics(): void {
  if (!env.observabilityMetricsEnabled || initialized) {
    return;
  }
  initialized = true;
  collectDefaultMetrics({ register });
}

export function registerPrometheusMetricsRoute(app: Express): void {
  if (!env.observabilityMetricsEnabled) {
    return;
  }
  initPrometheusMetrics();

  app.get("/metrics", (_req, res, next) => {
    void register
      .metrics()
      .then((body) => {
        res.status(200).set("Content-Type", register.contentType);
        res.end(body);
      })
      .catch(next);
  });
}

function statusCodeLabel(statusType: "completed" | "aborted", statusCode: number): string {
  if (statusType === "aborted") {
    return "0";
  }
  return String(statusCode);
}

function errorTypeLabel(statusType: "completed" | "aborted"): "aborted" | "none" {
  return statusType === "aborted" ? "aborted" : "none";
}

function isErrorLabel(statusType: "completed" | "aborted", statusCode: number): "true" | "false" {
  if (statusType === "aborted") {
    return "true";
  }
  if (Number.isFinite(statusCode) && statusCode >= 500) {
    return "true";
  }
  return "false";
}

export function recordHttpRequestMetrics(input: {
  method: string;
  route: string;
  statusCode: number;
  durationSeconds: number;
  statusType: "completed" | "aborted";
}): void {
  if (!env.observabilityMetricsEnabled) {
    return;
  }
  initPrometheusMetrics();
  const labels = {
    method: input.method,
    route: input.route,
    status_code: statusCodeLabel(input.statusType, input.statusCode),
    status_type: input.statusType,
    error_type: errorTypeLabel(input.statusType),
    is_error: isErrorLabel(input.statusType, input.statusCode),
  };
  httpRequestsTotal.inc(labels);
  httpRequestDurationSeconds.observe(labels, input.durationSeconds);
}

/** Paired with {@link endHttpRequestInFlight} — same `method` label. */
export function beginHttpRequestInFlight(method: string): void {
  if (!env.observabilityMetricsEnabled) {
    return;
  }
  initPrometheusMetrics();
  httpRequestsInFlight.labels(method).inc();
}

/** Paired with {@link beginHttpRequestInFlight}. */
export function endHttpRequestInFlight(method: string): void {
  if (!env.observabilityMetricsEnabled) {
    return;
  }
  initPrometheusMetrics();
  httpRequestsInFlight.labels(method).dec();
}
