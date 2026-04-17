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
  CORS_ORIGIN: z.string().optional(),
  CORS_CREDENTIALS: z.string().optional(),
  TRUST_PROXY: z.string().optional(),
  MONGODB_URI: z.string().trim().min(1, "MONGODB_URI must be set"),
  REQUEST_BODY_LIMIT: z.string().optional(),
  API_V1_PREFIX: z.string().optional(),
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
});

const envSchema = rawEnvSchema.transform((raw) => {
  const nodeEnv = raw.NODE_ENV ?? "development";
  const apiV1Prefix = parseApiV1Prefix(raw.API_V1_PREFIX);
  return {
    nodeEnv,
    port: parsePort(raw.PORT),
    logLevel: parseLogLevel(raw.LOG_LEVEL, nodeEnv),
    rateLimitWindowMs: parsePositiveInt(raw.RATE_LIMIT_WINDOW_MS, 60_000),
    rateLimitMax: parsePositiveInt(raw.RATE_LIMIT_MAX, 300),
    corsOrigin: parseCorsOrigin(raw.CORS_ORIGIN, nodeEnv),
    corsCredentials: parseBool(raw.CORS_CREDENTIALS, false),
    trustProxy: parseTrustProxy(raw.TRUST_PROXY),
    mongodbUri: raw.MONGODB_URI,
    bodyLimit: parseBodyLimit(raw.REQUEST_BODY_LIMIT),
    apiV1Prefix,
    jwtAccessSecret: raw.JWT_ACCESS_SECRET,
    jwtAccessTtl: raw.JWT_ACCESS_TTL?.trim() || "15m",
    jwtRefreshSecret: raw.JWT_REFRESH_SECRET,
    jwtRefreshTtl: raw.JWT_REFRESH_TTL?.trim() || "7d",
  };
});

export type Env = z.infer<typeof envSchema>;

/** Validated on import; invalid configuration throws before the process can serve traffic. */
export const env: Env = deepFreeze(envSchema.parse(process.env));
