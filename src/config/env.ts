import "dotenv/config";

const LOG_LEVELS = new Set(["fatal", "error", "warn", "info", "debug", "trace", "silent"]);

function parsePort(value: string | undefined): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0 && parsed < 65_536) {
    return parsed;
  }
  return 3000;
}

function parseLogLevel(value: string | undefined): string {
  if (value && LOG_LEVELS.has(value)) {
    return value;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
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

const nodeEnv = process.env.NODE_ENV ?? "development";

const mongodbUriRaw = process.env.MONGODB_URI?.trim();
if (!mongodbUriRaw || mongodbUriRaw.length === 0) {
  throw new Error("MONGODB_URI must be set");
}

export const env = {
  nodeEnv,
  port: parsePort(process.env.PORT),
  logLevel: parseLogLevel(process.env.LOG_LEVEL),
  rateLimitWindowMs: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: parsePositiveInt(process.env.RATE_LIMIT_MAX, 300),
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN, nodeEnv),
  corsCredentials: parseBool(process.env.CORS_CREDENTIALS, false),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  mongodbUri: mongodbUriRaw,
  bodyLimit: parseBodyLimit(process.env.REQUEST_BODY_LIMIT),
  apiV1Prefix: parseApiV1Prefix(process.env.API_V1_PREFIX),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET?.trim() || "dev-access-secret-change-me",
  jwtAccessTtl: process.env.JWT_ACCESS_TTL?.trim() || "15m",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET?.trim() || "dev-refresh-secret-change-me",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL?.trim() || "7d",
} as const;
