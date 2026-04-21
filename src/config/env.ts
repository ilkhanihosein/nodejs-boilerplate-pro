import "dotenv/config";
import { z } from "zod";
import { deepFreeze } from "../common/utils/deep-freeze.js";

const LOG_LEVELS = new Set(["fatal", "error", "warn", "info", "debug", "trace", "silent"]);

function parsePort(value: string | undefined): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0 && parsed < 65_536) {
    return parsed;
  }
  return 3000;
}

function parseLogLevel(value: string | undefined, nodeEnv: string): string {
  if (value && LOG_LEVELS.has(value)) {
    return value;
  }
  return nodeEnv === "production" ? "info" : "debug";
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function parseTracingExporter(value: string | undefined): "console" | "otlp" {
  const raw = value?.trim().toLowerCase();
  if (raw === "otlp") {
    return "otlp";
  }
  return "console";
}

/** Root trace sampling probability for `ParentBasedSampler` + `TraceIdRatioBasedSampler` (0–1 inclusive). */
function parseTraceSamplingRatio(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return 0.1;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    return 0.1;
  }
  return n;
}

/** Express `trust proxy`: false off; positive int = number of proxy hops (1 = single reverse proxy). */
function parseTrustProxy(value: string | undefined): boolean | number {
  const raw = value?.trim();
  if (!raw) {
    return false;
  }
  const lower = raw.toLowerCase();
  if (lower === "false" || lower === "0") {
    return false;
  }
  if (lower === "true") {
    return 1;
  }
  const parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return false;
}

function parseCorsOrigin(value: string | undefined, nodeEnv: string): boolean | string | string[] {
  const raw = value?.trim();
  if (!raw) {
    return nodeEnv === "production" ? false : true;
  }
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (list.length === 0) {
    return false;
  }
  const first = list[0];
  if (list.length === 1 && first !== undefined) {
    return first;
  }
  return list;
}

function parseBodyLimit(value: string | undefined): string {
  const raw = value?.trim();
  return raw && raw.length > 0 ? raw : "1mb";
}

const DEFAULT_API_V1_PREFIX = "/api/v1";

function parseApiV1Prefix(value: string | undefined): string {
  const raw = value?.trim();
  if (!raw) {
    return DEFAULT_API_V1_PREFIX;
  }
  if (!raw.startsWith("/")) {
    throw new Error("API_V1_PREFIX must start with /");
  }
  if (raw.includes("..")) {
    throw new Error("API_V1_PREFIX must not contain ..");
  }
  if (raw.length > 1 && raw.endsWith("/")) {
    return raw.slice(0, -1);
  }
  return raw;
}

const rawEnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().optional(),
  RATE_LIMIT_MAX: z.string().optional(),
  /** Required when NODE_ENV=production. When set in any env, `express-rate-limit` uses Redis (`rate-limit-redis`). */
  RATE_LIMIT_REDIS_URL: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  CORS_CREDENTIALS: z.string().optional(),
  TRUST_PROXY: z.string().optional(),
  MONGODB_URI: z.string().trim().min(1, "MONGODB_URI must be set"),
  REQUEST_BODY_LIMIT: z.string().optional(),
  API_V1_PREFIX: z.string().optional(),
  API_VERSION: z.string().optional(),
  API_DOCS_ENABLED: z.string().optional(),
  GIT_SHA: z.string().optional(),
  /** Short name in `/health` JSON `service` field (defaults to `http-api`). */
  SERVICE_NAME: z.string().optional(),
  JWT_ACCESS_SECRET: z
    .string()
    .trim()
    .min(1, "JWT_ACCESS_SECRET must be set (e.g. in .env); no default is applied"),
  JWT_REFRESH_SECRET: z
    .string()
    .trim()
    .min(1, "JWT_REFRESH_SECRET must be set (e.g. in .env); no default is applied"),
  JWT_ACCESS_TTL: z.string().optional(),
  JWT_REFRESH_TTL: z.string().optional(),
  /** JWT `iss` claim (sign + verify). Defaults match historical boilerplate tokens. */
  JWT_ISSUER: z.string().optional(),
  /** JWT `aud` claim (sign + verify). Must match what clients send / expect. */
  JWT_AUDIENCE: z.string().optional(),
  OBSERVABILITY_TRACING_ENABLED: z.string().optional(),
  OBSERVABILITY_METRICS_ENABLED: z.string().optional(),
  OBSERVABILITY_TRACING_EXPORTER: z.string().optional(),
  OBSERVABILITY_OTLP_TRACES_ENDPOINT: z.string().optional(),
  OBSERVABILITY_SERVICE_NAME: z.string().optional(),
  OBSERVABILITY_TRACE_SAMPLING_RATIO: z.string().optional(),
  OBSERVABILITY_ANONYMIZE_IP: z.string().optional(),
});

function envTransform(raw: z.infer<typeof rawEnvSchema>) {
  const nodeEnv = raw.NODE_ENV ?? "development";
  const apiV1Prefix = parseApiV1Prefix(raw.API_V1_PREFIX);
  return {
    nodeEnv,
    port: parsePort(raw.PORT),
    logLevel: parseLogLevel(raw.LOG_LEVEL, nodeEnv),
    rateLimitWindowMs: parsePositiveInt(raw.RATE_LIMIT_WINDOW_MS, 60_000),
    rateLimitMax: parsePositiveInt(raw.RATE_LIMIT_MAX, 300),
    rateLimitRedisUrl: (() => {
      const u = raw.RATE_LIMIT_REDIS_URL?.trim();
      return u !== undefined && u.length > 0 ? u : undefined;
    })(),
    corsOrigin: parseCorsOrigin(raw.CORS_ORIGIN, nodeEnv),
    corsCredentials: parseBool(raw.CORS_CREDENTIALS, false),
    trustProxy: parseTrustProxy(raw.TRUST_PROXY),
    mongodbUri: raw.MONGODB_URI,
    bodyLimit: parseBodyLimit(raw.REQUEST_BODY_LIMIT),
    apiV1Prefix,
    apiVersion: raw.API_VERSION?.trim() || "1",
    apiDocsEnabled: parseBool(raw.API_DOCS_ENABLED, nodeEnv !== "production"),
    gitSha: raw.GIT_SHA?.trim() || undefined,
    serviceName: raw.SERVICE_NAME?.trim() || "http-api",
    jwtAccessSecret: raw.JWT_ACCESS_SECRET,
    jwtAccessTtl: raw.JWT_ACCESS_TTL?.trim() || "15m",
    jwtRefreshSecret: raw.JWT_REFRESH_SECRET,
    jwtRefreshTtl: raw.JWT_REFRESH_TTL?.trim() || "7d",
    jwtIssuer: (() => {
      const s = raw.JWT_ISSUER?.trim();
      return s !== undefined && s.length > 0 ? s : "e-commerce-api";
    })(),
    jwtAudience: (() => {
      const s = raw.JWT_AUDIENCE?.trim();
      return s !== undefined && s.length > 0 ? s : "e-commerce-client";
    })(),
    observabilityTracingEnabled: parseBool(raw.OBSERVABILITY_TRACING_ENABLED, false),
    observabilityMetricsEnabled: parseBool(raw.OBSERVABILITY_METRICS_ENABLED, false),
    observabilityTracingExporter: parseTracingExporter(raw.OBSERVABILITY_TRACING_EXPORTER),
    observabilityOtlpTracesEndpoint: raw.OBSERVABILITY_OTLP_TRACES_ENDPOINT?.trim() || undefined,
    observabilityServiceName: raw.OBSERVABILITY_SERVICE_NAME?.trim() || "http-api",
    observabilityTraceSamplingRatio: parseTraceSamplingRatio(
      raw.OBSERVABILITY_TRACE_SAMPLING_RATIO,
    ),
    observabilityAnonymizeIp: parseBool(raw.OBSERVABILITY_ANONYMIZE_IP, false),
  };
}

const envSchema = rawEnvSchema.transform(envTransform).superRefine((out, ctx) => {
  if (out.nodeEnv === "production" && out.rateLimitRedisUrl === undefined) {
    ctx.addIssue({
      code: "custom",
      message:
        "RATE_LIMIT_REDIS_URL is required when NODE_ENV=production so HTTP rate limits are shared across replicas (in-memory limits are not production-safe)",
      path: ["RATE_LIMIT_REDIS_URL"],
    });
  }

  if (out.rateLimitRedisUrl !== undefined) {
    try {
      const parsed = new URL(out.rateLimitRedisUrl);
      if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
        ctx.addIssue({
          code: "custom",
          message: "RATE_LIMIT_REDIS_URL must use redis:// or rediss:// scheme",
          path: ["RATE_LIMIT_REDIS_URL"],
        });
      }
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "RATE_LIMIT_REDIS_URL must be a valid URL",
        path: ["RATE_LIMIT_REDIS_URL"],
      });
    }
  }

  if (out.observabilityTracingEnabled && out.observabilityTracingExporter === "otlp") {
    const ep = out.observabilityOtlpTracesEndpoint;
    if (ep === undefined || ep.length === 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "OBSERVABILITY_OTLP_TRACES_ENDPOINT is required when OBSERVABILITY_TRACING_EXPORTER is otlp and tracing is enabled",
        path: ["OBSERVABILITY_OTLP_TRACES_ENDPOINT"],
      });
      return;
    }
    try {
      void new URL(ep);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "OBSERVABILITY_OTLP_TRACES_ENDPOINT must be a valid absolute URL",
        path: ["OBSERVABILITY_OTLP_TRACES_ENDPOINT"],
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

/** Validated on import; invalid configuration throws before the process can serve traffic. */
export const env: Env = deepFreeze(envSchema.parse(process.env));
