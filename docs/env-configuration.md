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

| `process.env`          | Required? | Default / behavior                                       | `env` property                      |
| ---------------------- | --------- | -------------------------------------------------------- | ----------------------------------- |
| `NODE_ENV`             | No        | `"development"` if unset                                 | `nodeEnv`                           |
| `PORT`                 | No        | `3000` if invalid/unset                                  | `port`                              |
| `LOG_LEVEL`            | No        | `info` in production, `debug` otherwise if invalid/unset | `logLevel`                          |
| `RATE_LIMIT_WINDOW_MS` | No        | `60000`                                                  | `rateLimitWindowMs`                 |
| `RATE_LIMIT_MAX`       | No        | `300`                                                    | `rateLimitMax`                      |
| `CORS_ORIGIN`          | No        | See parsing below                                        | `corsOrigin`                        |
| `CORS_CREDENTIALS`     | No        | `false`                                                  | `corsCredentials`                   |
| `TRUST_PROXY`          | No        | `false`                                                  | `trustProxy` (boolean or hop count) |
| `MONGODB_URI`          | **Yes**   | —                                                        | `mongodbUri`                        |
| `REQUEST_BODY_LIMIT`   | No        | `"1mb"`                                                  | `bodyLimit`                         |
| `API_V1_PREFIX`        | No        | `"/api/v1"`; must start with `/`, no `..`                | `apiV1Prefix`                       |
| `JWT_ACCESS_SECRET`    | **Yes**   | —                                                        | `jwtAccessSecret`                   |
| `JWT_REFRESH_SECRET`   | **Yes**   | —                                                        | `jwtRefreshSecret`                  |
| `JWT_ACCESS_TTL`       | No        | `"15m"`                                                  | `jwtAccessTtl`                      |
| `JWT_REFRESH_TTL`      | No        | `"7d"`                                                   | `jwtRefreshTtl`                     |

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
- [troubleshooting.md](./troubleshooting.md) — startup failures
