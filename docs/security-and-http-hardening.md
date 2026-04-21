# Security and HTTP hardening

Defaults applied in **`src/app.ts`** and related middleware. Env knobs are summarized here; full parsing rules live in [env-configuration.md](./env-configuration.md).

---

## Response headers and surface

- **`helmet`** — security-oriented HTTP headers. **`crossOriginResourcePolicy`** is set to **`cross-origin`** so common dev setups (e.g. separate frontend origin) are less likely to break; tighten if your threat model requires stricter CORP.
- **`X-Powered-By`** is disabled.

---

## CORS

Configured from **`env.corsOrigin`** and **`env.corsCredentials`**. In **development**, if **`CORS_ORIGIN`** is unset, **any** origin is allowed. In **production**, unset means **no** CORS origin (reflect that in your browser client config).

---

## Rate limiting

**`express-rate-limit`** uses **`RATE_LIMIT_WINDOW_MS`** and **`RATE_LIMIT_MAX`** (per client IP, sliding window). **`GET /health`**, **`GET /health/ready`**, **`/docs`**, and **`GET /metrics`** are **skipped** so probes and docs are not throttled.

**Store:**

- **Default:** in-memory counters (**one process**). Fine for local dev or a single container.
- **Multi-replica / several pods:** set **`RATE_LIMIT_REDIS_URL`** to a **`redis://`** or **`rediss://`** URL. **`server.ts`** connects with **`node-redis`**, builds **`rate-limit-redis`**’s **`RedisStore`**, and passes it into **`createApp({ rateLimitStore })`**. Keys use the prefix **`rl:http:`** in Redis. On shutdown the client is closed after the HTTP server stops accepting connections.

Compose ships an optional **`redis`** service; uncomment **`RATE_LIMIT_REDIS_URL`** on the **`api`** service in **`docker-compose.yml`** when you want shared limits in Docker.

---

## Trust proxy

**`app.set("trust proxy", env.trustProxy)`** controls how **`req.ip`** (and thus rate limiting) is derived behind reverse proxies. Set **`TRUST_PROXY`** appropriately in production (often **`1`** for a single hop). Wrong values can spoof client IPs or break limits.

---

## Request body size

**`express.json`** and **`express.urlencoded`** use **`env.bodyLimit`** (**`REQUEST_BODY_LIMIT`**, default **`1mb`**). Increase only when needed; large bodies increase memory and abuse surface.

---

## Auth secrets (JWT)

**`JWT_ACCESS_SECRET`** and **`JWT_REFRESH_SECRET`** are **required** with no in-code defaults. Use strong random values in every non-demo environment. Token shapes and middleware: [authentication-and-authorization.md](./authentication-and-authorization.md).

---

## Related documents

| Topic            | Document                                       |
| ---------------- | ---------------------------------------------- |
| Env reference    | [env-configuration.md](./env-configuration.md) |
| Middleware order | [request-lifecycle.md](./request-lifecycle.md) |
| Validation       | [validation.md](./validation.md)               |
