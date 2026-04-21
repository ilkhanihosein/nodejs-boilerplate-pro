# Environment configuration

Runtime configuration is read from **`process.env`**, validated with **Zod** in **`src/config/env.ts`**, then exposed as a single **frozen** object **`env`**. Importing that module **throws** if validation fails—there is no lazy load.

---

## Source of truth

| Item                           | Location                      |
| ------------------------------ | ----------------------------- |
| Schema + parsing               | `src/config/env.ts`           |
| Documented keys for local copy | `.env.example`                |
| Typed shape                    | `export type Env` in `env.ts` |

Application code should import **`env`** (or pass values derived from it), not read **`process.env`** directly, so new variables are forced through the schema.

---

## Variables (process → `env`)

| `process.env`                        | Required?              | Default / behavior                                       | `env` property                                                                                                                                                        |
| ------------------------------------ | ---------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                           | No                     | `"development"` if unset                                 | `nodeEnv`                                                                                                                                                             |
| `PORT`                               | No                     | `3000` if invalid/unset                                  | `port`                                                                                                                                                                |
| `LOG_LEVEL`                          | No                     | `info` in production, `debug` otherwise if invalid/unset | `logLevel`                                                                                                                                                            |
| `RATE_LIMIT_WINDOW_MS`               | No                     | `60000`                                                  | `rateLimitWindowMs`                                                                                                                                                   |
| `RATE_LIMIT_MAX`                     | No                     | `300`                                                    | `rateLimitMax`                                                                                                                                                        |
| `RATE_LIMIT_REDIS_URL`               | No                     | omitted if unset/empty                                   | `rateLimitRedisUrl` — optional **`redis://`** / **`rediss://`** for shared HTTP rate limits (see [security-and-http-hardening.md](./security-and-http-hardening.md)). |
| `CORS_ORIGIN`                        | No                     | See parsing below                                        | `corsOrigin`                                                                                                                                                          |
| `CORS_CREDENTIALS`                   | No                     | `false`                                                  | `corsCredentials`                                                                                                                                                     |
| `TRUST_PROXY`                        | No                     | `false`                                                  | `trustProxy` (boolean or hop count)                                                                                                                                   |
| `MONGODB_URI`                        | **Yes**                | —                                                        | `mongodbUri`                                                                                                                                                          |
| `REQUEST_BODY_LIMIT`                 | No                     | `"1mb"`                                                  | `bodyLimit`                                                                                                                                                           |
| `API_V1_PREFIX`                      | No                     | `"/api/v1"`; must start with `/`, no `..`                | `apiV1Prefix`                                                                                                                                                         |
| `API_VERSION`                        | No                     | `"1"` if unset/empty                                     | `apiVersion` (errors, health, JSON)                                                                                                                                   |
| `API_DOCS_ENABLED`                   | No                     | `true` when `NODE_ENV !== "production"`, else `false`    | `apiDocsEnabled` (Swagger at `/docs`)                                                                                                                                 |
| `GIT_SHA`                            | No                     | omitted if unset/empty                                   | `gitSha` (optional on `/health`)                                                                                                                                      |
| `SERVICE_NAME`                       | No                     | `"http-api"` if unset/empty                              | `serviceName` — **`service`** field on **`/health`** responses.                                                                                                       |
| `JWT_ACCESS_SECRET`                  | **Yes**                | —                                                        | `jwtAccessSecret`                                                                                                                                                     |
| `JWT_REFRESH_SECRET`                 | **Yes**                | —                                                        | `jwtRefreshSecret`                                                                                                                                                    |
| `JWT_ACCESS_TTL`                     | No                     | `"15m"`                                                  | `jwtAccessTtl`                                                                                                                                                        |
| `JWT_REFRESH_TTL`                    | No                     | `"7d"`                                                   | `jwtRefreshTtl`                                                                                                                                                       |
| `JWT_ISSUER`                         | No                     | `"e-commerce-api"` if unset/empty                        | `jwtIssuer` — access + refresh **`iss`** (must match verifying clients).                                                                                              |
| `JWT_AUDIENCE`                       | No                     | `"e-commerce-client"` if unset/empty                     | `jwtAudience` — access + refresh **`aud`**.                                                                                                                           |
| `OBSERVABILITY_TRACING_ENABLED`      | No                     | `false`                                                  | `observabilityTracingEnabled` — OpenTelemetry `NodeSDK` (HTTP + Express + MongoDB).                                                                                   |
| `OBSERVABILITY_METRICS_ENABLED`      | No                     | `false`                                                  | `observabilityMetricsEnabled` — `GET /metrics` + HTTP histogram/counter.                                                                                              |
| `OBSERVABILITY_TRACING_EXPORTER`     | No                     | `console` (`console` or `otlp`)                          | `observabilityTracingExporter` — span export target.                                                                                                                  |
| `OBSERVABILITY_OTLP_TRACES_ENDPOINT` | When OTLP + tracing on | —                                                        | `observabilityOtlpTracesEndpoint` — OTLP/HTTP traces URL (must be valid if required).                                                                                 |
| `OBSERVABILITY_SERVICE_NAME`         | No                     | `http-api`                                               | `observabilityServiceName` — `service.name` on traces.                                                                                                                |
| `OBSERVABILITY_TRACE_SAMPLING_RATIO` | No                     | `0.1` (invalid/out of range → `0.1`)                     | `observabilityTraceSamplingRatio` — root `TraceIdRatioBasedSampler` inside `ParentBasedSampler`.                                                                      |
| `OBSERVABILITY_ANONYMIZE_IP`         | No                     | `false`                                                  | `observabilityAnonymizeIp` — mask `net.peer.ip` on spans (IPv4 last octet → `0`, IPv6 truncated).                                                                     |

**CORS:** if `CORS_ORIGIN` is unset, development allows all origins (`true`); production disables CORS (`false`). Comma-separated values become a list of allowed origins.

**Trust proxy:** see comments in `.env.example`; affects `req.ip` and rate limiting behind reverse proxies.

---

## Changing the contract

When you add or remove configuration:

1. Update **`rawEnvSchema`** / **`envSchema.transform`** in **`env.ts`**.
2. Mirror keys and comments in **`.env.example`**.
3. Update this document and any scripts that embed env (e.g. **migrate-mongo** config) if they read the same keys.

---

## Related

- [architecture.md](./architecture.md) — where `env` fits in the stack
- [docker-and-local-development.md](./docker-and-local-development.md) — Compose env and Mongo URI from host vs container
- [security-and-http-hardening.md](./security-and-http-hardening.md) — how CORS, rate limit, trust proxy, and body limit use `env`
- [authentication-and-authorization.md](./authentication-and-authorization.md) — JWT secrets and TTLs in practice
- [errors-and-json-responses.md](./errors-and-json-responses.md) — production vs dev error bodies (driven by `NODE_ENV`)
- [troubleshooting.md](./troubleshooting.md) — startup failures
- [observability.md](./observability.md) — tracing, `/metrics`, and log fields
