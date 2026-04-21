# HTTP API boilerplate

**Node.js 22** (see **`.nvmrc`** and **`package.json` → `engines`**; CI uses the same major), **TypeScript**, **Express 5**, **MongoDB** (Mongoose) starter for JSON HTTP APIs: validated config, structured logging, security defaults, rate limiting, centralized errors, versioned routing, tests (**Vitest** + **supertest** + coverage thresholds), optional **Docker Compose** (MongoDB, Redis for rate limits).

**Package name:** **`http-api-boilerplate`** in **`package.json`** — rename when you fork for a real product.

**Stack:** Express, Mongoose, Zod (config + request parsing), pino, migrate-mongo. **Optional observability:** OpenTelemetry tracing and Prometheus **`/metrics`** (see **[`docs/observability.md`](./docs/observability.md)**).

**Using this as a base:** clone or fork, **adjust** `src/config/env.ts` and **`.env.example`** for your env vars, and **rewire** `src/api/v1/routes.ts` to your feature routers. Remove sample modules you do not need (see below).

---

## Documentation

All architecture and system behavior are documented under **[`docs/`](./docs)**. Start at **[`docs/README.md`](./docs/README.md)** (index: architecture, auth, CI/hooks, database migrations/seed, Docker/local dev, env, errors, testing, troubleshooting, security, logging, validation, lifecycle, async context). **OpenAPI:** Swagger UI at **`/docs`** when **`API_DOCS_ENABLED`** is on (default in non-production). The spec is **generated from Zod** (`@asteasolutions/zod-to-openapi`); add a **`registerPath`** in **`src/api/v1/openapi.ts`** using the same request schemas as **`validateRequest`** — see **[`docs/openapi.md`](./docs/openapi.md)**.

---

## API structure

Public HTTP routes are composed under a **versioned prefix** (default **`/api/v1`**, from **`API_V1_PREFIX`** in `src/config/env.ts`). **`src/api/v1/routes.ts`** mounts feature routers onto that prefix.

**Business logic** lives in **`src/modules/<feature>/`** (routes, controllers, services, models per feature). Keep **`src/api/`** thin: routing table only.

---

## Repository structure

```text
.
├── docs/                 # index + architecture, env, testing, troubleshooting, …
├── tests/
├── migrations/
├── migrate-mongo-config.ts
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── server.ts
    ├── app.ts
    ├── api/v1/routes.ts    # mount modules under the versioned API
    ├── modules/<feature>/  # one folder per feature
    ├── common/             # middlewares, logger, errors, utils
    ├── config/             # env (Zod), database helpers
    ├── database/           # optional scripts (e.g. seed)
    └── types/express.d.ts
```

| You add…                           | Put it in…                                       |
| ---------------------------------- | ------------------------------------------------ |
| A **feature**                      | `src/modules/<feature>/`                         |
| **Routes** under the versioned API | `src/api/v1/routes.ts`                           |
| **Global middleware**              | `src/common/middlewares/` → wire in `src/app.ts` |
| **Env keys**                       | `src/config/env.ts` + `.env.example`             |

---

## Removing the sample `auth` and `users` modules

The **`src/modules/auth`** and **`src/modules/users`** trees are a **removable reference** for JWT access/refresh and admin-only listing—not required for the framework.

1. Delete **`src/modules/auth/`** and **`src/modules/users/`** (and drop related tests under **`tests/`** if you remove the routes entirely).
2. In **`src/api/v1/routes.ts`**, remove **`apiV1Router.use("/auth", …)`** and **`apiV1Router.use("/users", …)`**.
3. In **`src/api/v1/openapi.ts`**, remove **`authEndpointRegistry`** and **`usersEndpointRegistry`** from **`contributeOpenApi`** (and run **`npm run openapi:generate`**).
4. Tighten **`src/config/env.ts`** and **`.env.example`**: if you drop JWT routes, remove **`JWT_*`** keys and any code paths that still expect them (see **`docs/authentication-and-authorization.md`**).
5. Revisit **`src/database/seed.ts`** and **migrations** if they referenced the sample **`User`** model.

JWT **issuer/audience** strings in **`src/modules/auth/jwt.utils.ts`** still default to the template values; align them with your product and clients when you ship real auth.

---

## Quick start

1. Copy **`.env.example`** to **`.env`** and set every variable marked required there (including database URI and signing secrets used by the template).
2. **`npm install`**
3. **`npm run dev`** — listens on **`PORT`** (default **3000**).

Invalid or missing required env values cause the process to exit on startup when **`src/config/env.ts`** loads.

---

## Scripts

| Script                                | Purpose                                                        |
| ------------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                         | `tsx watch` on `src/server.ts`                                 |
| `npm run build`                       | Compile to `dist/`                                             |
| `npm start`                           | Run `dist/server.js`                                           |
| `npm test`                            | Vitest (watch)                                                 |
| `npm run test:ci`                     | Vitest once + **coverage** thresholds                          |
| `npm run check`                       | format + lint + tests + frontend types + build + OpenAPI check |
| `npm run db:migrate`                  | Apply database migrations                                      |
| `npm run db:migrate:down`             | Roll back last migration                                       |
| `npm run db:migrate:status`           | Migration status                                               |
| `npm run db:migrate:create -- <name>` | Scaffold migration                                             |
| `npm run db:seed`                     | Run optional seed script                                       |

---

## Docker

```bash
docker compose up --build
```

Brings up the **API**, **MongoDB**, and **Redis**. Point **`MONGODB_URI`** in **`.env`** at the database service. Set **`RATE_LIMIT_REDIS_URL=redis://redis:6379`** on the API service when you want shared rate limits (see **`.env.example`**). For local compose, secrets are often read from **`.env`**.

**Production:** supply configuration and secrets through your infrastructure (secret managers, orchestrator env, etc.). **`.env`** files are for **local development** only.

---

## Documentation is the source of truth

Behavior, middleware order, logging, validation, async context, migrations, Docker/health, security defaults, auth, error JSON, and CI/hooks are described in **`/docs`**. This README is onboarding and navigation—not a duplicate of those details.
