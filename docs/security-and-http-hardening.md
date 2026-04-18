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

**`express-rate-limit`** uses **`RATE_LIMIT_WINDOW_MS`** and **`RATE_LIMIT_MAX`** (per client IP, sliding window). **`GET /health`** and **`GET /health/ready`** are **skipped** so orchestrators are not throttled.

**Multi-instance caveat:** the default store is **in-memory**. Each process has its own counters. Behind several API replicas, a client can exceed the intended global budget unless you plug in a **shared store** (for example Redis) via the rate-limit middleware options in your fork.

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
