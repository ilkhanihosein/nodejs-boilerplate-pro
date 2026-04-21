import { ClientRequest, IncomingMessage, ServerResponse } from "node:http";
import type { Span } from "@opentelemetry/api";
import { SpanStatusCode } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ConsoleSpanExporter,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { MongoDBInstrumentation } from "@opentelemetry/instrumentation-mongodb";
import type { Request } from "express";
import { clientIpForTelemetry } from "../common/http/client-ip.js";
import { anonymizeIpForTelemetry } from "../common/http/ip-anonymize.js";
import { httpOutcomeAtResponseClose } from "../common/http/http-request-outcome.js";
import { telemetryUserAgentSummary } from "../common/http/user-agent-summary.js";
import { httpMetricsNormalizedTarget, resolveHttpRoute } from "../common/http/http-route-label.js";
import { getRequestId } from "../common/context/request-context.js";
import { getLogger } from "../common/logger.js";
import { env } from "../config/env.js";

let sdk: NodeSDK | undefined;

const ATTR_VALUE_MAX = 256;
const USER_ID_ATTR_MAX = 64;
const USER_AGENT_SUMMARY_MAX = 48;
const NET_PEER_IP_MAX = 64;

function clampAttr(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

function isExpressRequest(req: IncomingMessage): req is Request {
  return typeof (req as Request).originalUrl === "string";
}

/**
 * Runs in `HttpInstrumentation` `applyCustomAttributesOnSpan` after the HTTP instrumentation
 * sets response attributes and status — same outcome rules as Prometheus middleware:
 * **`httpOutcomeAtResponseClose`** (`aborted` ⇔ **`!writableEnded`**), **`resolveHttpRoute`** for **`http.route`**.
 */
function enrichIncomingHttpServerSpan(
  span: Span,
  request: IncomingMessage | ClientRequest,
  response: IncomingMessage | ServerResponse,
): void {
  if (!(request instanceof IncomingMessage) || !(response instanceof ServerResponse)) {
    return;
  }
  if (!isExpressRequest(request)) {
    return;
  }
  const req = request;

  const statusType = httpOutcomeAtResponseClose(response);
  const statusCodeAttr = statusType === "aborted" ? 0 : response.statusCode;

  span.setAttribute("http.route", clampAttr(resolveHttpRoute(req), ATTR_VALUE_MAX));
  span.setAttribute("http.target", clampAttr(httpMetricsNormalizedTarget(req), ATTR_VALUE_MAX));
  const method = typeof req.method === "string" && req.method.length > 0 ? req.method : "GET";
  span.setAttribute("http.request.method", clampAttr(method, 32));
  span.setAttribute("http.response.status_code", statusCodeAttr);
  span.setAttribute("app.http.status_type", statusType);

  const uaSummary = telemetryUserAgentSummary(
    typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
  );
  span.setAttribute("http.user_agent", clampAttr(uaSummary, USER_AGENT_SUMMARY_MAX));

  let peerIp = clientIpForTelemetry(req, env.trustProxy);
  if (peerIp !== undefined && env.observabilityAnonymizeIp) {
    peerIp = anonymizeIpForTelemetry(peerIp);
  }
  if (peerIp !== undefined) {
    span.setAttribute("net.peer.ip", clampAttr(peerIp, NET_PEER_IP_MAX));
  }

  const requestId = getRequestId();
  if (requestId !== undefined) {
    span.setAttribute("app.request_id", clampAttr(requestId, ATTR_VALUE_MAX));
  }

  const authUser = req.authUser;
  if (authUser !== undefined) {
    span.setAttribute("app.user_id", clampAttr(authUser.id, USER_ID_ATTR_MAX));
  }

  const serverError =
    statusType === "completed" &&
    Number.isFinite(response.statusCode) &&
    response.statusCode >= 500;

  if (statusType === "aborted") {
    span.setAttribute("error.type", "aborted");
    span.setAttribute("error", true);
    span.setStatus({ code: SpanStatusCode.ERROR, message: "request_aborted" });
  } else if (serverError) {
    span.setAttribute("error", true);
    span.setStatus({ code: SpanStatusCode.ERROR, message: "http_status_error" });
  }
}

function metricsPathFromIncomingUrl(url: string | undefined): string {
  if (url === undefined) {
    return "";
  }
  const path = url.split("?")[0] ?? "";
  return path.split("#")[0] ?? "";
}

function buildTraceExporter() {
  if (env.observabilityTracingExporter === "otlp") {
    const url = env.observabilityOtlpTracesEndpoint;
    if (url === undefined || url.length === 0) {
      throw new Error(
        "OTLP traces endpoint missing (configuration should have been rejected by env schema)",
      );
    }
    return new OTLPTraceExporter({ url });
  }
  return new ConsoleSpanExporter();
}

/**
 * Head-based sampling: ratio applies to new roots. Retaining *every* 5xx/aborted trace while
 * subsampling successes requires tail sampling (e.g. OpenTelemetry Collector) or raising
 * `OBSERVABILITY_TRACE_SAMPLING_RATIO` — outcome attributes here support collector policies.
 */
function buildSampler(): ParentBasedSampler {
  return new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(env.observabilityTraceSamplingRatio),
  });
}

function startTracing(): void {
  if (sdk !== undefined) {
    return;
  }
  const traceExporter = buildTraceExporter();

  const instance = new NodeSDK({
    serviceName: env.observabilityServiceName,
    traceExporter,
    sampler: buildSampler(),
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (req) => {
          const path = metricsPathFromIncomingUrl(req.url);
          return path === "/metrics";
        },
        applyCustomAttributesOnSpan: (span, request, response) => {
          enrichIncomingHttpServerSpan(span, request, response);
        },
      }),
      new ExpressInstrumentation(),
      new MongoDBInstrumentation(),
    ],
  });

  instance.start();
  sdk = instance;
  getLogger().info(
    {
      event: "otel_tracing_started",
      exporter: env.observabilityTracingExporter,
      traceSamplingRatio: env.observabilityTraceSamplingRatio,
    },
    "opentelemetry_tracing_started",
  );
}

/**
 * Initializes OpenTelemetry tracing once per process when enabled.
 * Loaded as a side-effect import from `server.ts` before Express/Mongoose so patches apply.
 */
if (env.observabilityTracingEnabled) {
  startTracing();
}

export async function shutdownTracing(): Promise<void> {
  if (sdk === undefined) {
    return;
  }
  const instance = sdk;
  sdk = undefined;
  try {
    await instance.shutdown();
    getLogger().info({ event: "otel_tracing_shutdown" }, "opentelemetry_tracing_shutdown_complete");
  } catch (err: unknown) {
    getLogger().error(
      { err, event: "otel_tracing_shutdown_error" },
      "opentelemetry_tracing_shutdown_failed",
    );
  }
}
