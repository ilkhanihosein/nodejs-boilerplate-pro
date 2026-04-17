# e-commerce-api

Node.js **20+**, **TypeScript**, **Express 5**, **MongoDB** (Mongoose) — boilerplate for HTTP APIs: structured logging (pino), env validation, security headers, CORS, rate limiting, centralized errors, **Zod** request validation, **JWT auth + RBAC**, **`/api/v1`** versioning, integration tests (**Vitest** + **supertest**), **migrate-mongo** schema migrations, a **seed** script, and **Docker Compose** for local stack.

## What is `src/api` for?

**`src/api`** is only the **HTTP “front door” for a specific API version** (here **`v1`**).

- It defines **which URL prefix** belongs to this version (wired in `app.ts` as `/api/v1`).
- It **composes routers**: you mount feature routers here (e.g. products, orders) with `apiV1Router.use("/products", productsRouter)`.
- It should stay **thin**: no heavy business logic here — that belongs under **`src/modules/<feature>`** (services, Mongoose models, controllers).

**Contrast with `src/modules`:**

| Location             | Role                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| `src/api/v1/…`       | Versioned routing table: “`/api/v1` + this path → that router”.            |
| `src/modules/…`      | Domain feature: routes/controller/service/model for one bounded area.      |
| `src/modules/health` | Operational endpoint **`/health`** (mounted at root, not under `/api/v1`). |

**Example (future):** after you add `src/modules/products/products.routes.ts`, you import it in `src/api/v1/routes.ts` and run:

`apiV1Router.use("/products", productsRouter);`  
→ public URL becomes **`GET /api/v1/products`**, etc.

---

## Repository layout

Below is the **intended shape** of this repo: what each folder is for, and **where to add** new code.

```text
e-commerce/                          # repo root
├── .env.example                     # documented env vars (copy → .env)
├── .dockerignore
├── docker-compose.yml               # local stack: API + MongoDB
├── Dockerfile                       # production-style image build
├── package.json
├── tsconfig.json
├── vitest.config.ts                 # integration tests (Vitest)
├── eslint.config.mjs
├── migrate-mongo-config.js          # migrate-mongo (reads MONGODB_URI from .env)
├── migrations/                      # DB migrations (migrate-mongo, ESM export up/down)
├── README.md
│
├── .github/
│   └── workflows/
│       └── ci.yml                   # CI: npm ci + npm run check
│
├── tests/                           # tests only (not compiled into dist by tsc)
│   ├── health.integration.test.ts
│   ├── api-v1.integration.test.ts
│   ├── auth.integration.test.ts     # auth lifecycle + refresh rotation (mongodb-memory-server)
│   └── …                            # unit tests (*.unit.test.ts), more integration tests
│
└── src/                             # all application TypeScript
    ├── server.ts                    # process entry: Mongo connect, HTTP listen, shutdown
    ├── app.ts                       # Express app factory: global middleware + mounts
    │
    ├── api/                         # versioned public HTTP API (routing composition)
    │   └── v1/
    │       └── routes.ts            # mount: /api/v1 → routers (add v2/ later if needed)
    │
    ├── modules/                     # business features (one folder per area)
    │   ├── health/                  # example: infra health (served at /health)
    │   │   ├── health.routes.ts
    │   │   └── health.controller.ts
    │   ├── auth/                    # register/login/refresh/logout/me + JWT + refresh sessions
    │   ├── users/                   # user model + admin-only user management routes
    │   ├── products/
    │   ├── orders/
    │   └── …                        # cart, payments, auth, …
    │
    ├── common/                      # shared across modules (not domain-specific)
    │   ├── logger.ts
    │   ├── errors/
    │   │   └── app-error.ts         # typed HTTP errors
    │   ├── middlewares/             # express middlewares
    │   │   ├── error-handler.ts
    │   │   ├── http-logger.ts
    │   │   ├── http-rate-limit.ts
    │   │   └── validate-request.ts # Zod middleware + requireValidatedBody/Query/Params helpers
    │   ├── utils/                   # small pure helpers
    │   ├── types/                   # shared TS types
    │   └── constants/               # shared constants
    │
    ├── config/                      # boot configuration (env, DB)
    │   ├── env.ts                   # parses process.env (incl. apiV1Prefix / API_V1_PREFIX)
    │   └── database.ts              # mongoose connect/disconnect helpers
    │
    ├── database/                    # one-off DB scripts (not HTTP)
    │   └── seed.ts                  # idempotent seed (tsx); uses same MONGODB_URI as the app
    │
    └── types/
        └── express.d.ts             # global TS augmentations (e.g. req.validated)
```

### Where to put new things (cheat sheet)

| You are adding…                        | Put it in…                                                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New **REST** area (e.g. products)      | `src/modules/products/` (router, controller, service, model)                                                                                                          |
| **Register** that area under `/api/v1` | `src/api/v1/routes.ts` → `apiV1Router.use("/products", productsRouter)`                                                                                               |
| **Global** middleware (auth, etc.)     | `src/common/middlewares/` → wire in `src/app.ts`                                                                                                                      |
| **New env variable**                   | `src/config/env.ts` + `.env.example`                                                                                                                                  |
| **Shared** error or helper             | `src/common/errors/` or `src/common/utils/`                                                                                                                           |
| **Operational** route (metrics, ping)  | Often `src/modules/…` or small router mounted in `app.ts` **outside** `/api/v1`                                                                                       |
| **Integration test** for an endpoint   | `tests/*.integration.test.ts`                                                                                                                                         |
| **MongoDB migration** (indexes, etc.)  | `migrations/*.js` → `npm run db:migrate:create` → edit → `npm run db:migrate`                                                                                         |
| **Reference / demo data**              | `src/database/seed.ts` → `npm run db:seed` (idempotent upserts)                                                                                                       |
| **Zod body/query/params types**        | Export `z.infer<typeof mySchema>` from `*.schemas.ts`; in handlers use `requireValidatedBody` / `Query` / `Params` from `validate-request.ts` after `validateRequest` |

### Request validation pattern

1. Define Zod schemas in `src/modules/<feature>/*.schemas.ts` and export **`z.infer<…>` types** next to them.
2. On the route: `validateRequest({ body: myBodySchema })` (and/or `query`, `params`).
3. In the controller: `const body = requireValidatedBody(req) as MyBody` (same for `requireValidatedQuery` / `requireValidatedParams`).  
   `req.validated.*` stays typed as `unknown` in Express; the cast documents the contract that the route middleware enforced.

---

## Quick start (host)

1. Copy env: `cp .env.example .env` and set **`MONGODB_URI`** (required).
2. `npm ci`
3. `npm run dev` — listens on `PORT` (default **3000**).

Use **`REQUEST_BODY_LIMIT`** in `.env` if you tune JSON body size (not `BODY_LIMIT`).
For authentication, set **`JWT_ACCESS_SECRET`** and **`JWT_REFRESH_SECRET`** in non-dev environments.

## Scripts

| Script                                | Purpose                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`                         | `tsx watch` on `src/server.ts`                                             |
| `npm run build`                       | TypeScript compile to `dist/`                                              |
| `npm start`                           | Run compiled `dist/server.js`                                              |
| `npm test`                            | Vitest watch mode                                                          |
| `npm run test:ci`                     | Vitest single run (CI)                                                     |
| `npm run check`                       | format + lint + tests + build                                              |
| `npm run db:migrate`                  | Apply pending **migrate-mongo** migrations (`MONGODB_URI` required)        |
| `npm run db:migrate:down`             | Roll back the **last** applied migration                                   |
| `npm run db:migrate:status`           | Show applied / pending migrations                                          |
| `npm run db:migrate:create -- <name>` | Scaffold a migration (e.g. `npm run db:migrate:create -- add-carts-index`) |
| `npm run db:seed`                     | Run **TypeScript** seed (`src/database/seed.ts`) — idempotent upserts      |

## Database migrations & seeding

- **Migrations** use [**migrate-mongo**](https://github.com/seppevs/migrate-mongo): config in **`migrate-mongo-config.js`** (ESM), changelog collection **`migration_changelog`**. Requires **`MONGODB_URI`** with a database path (e.g. `mongodb://127.0.0.1:27017/ecommerce`).
- Example migration: **`migrations/20250417123000-users-email-unique-index.js`** — unique index on `users.email` (safe before the `users` collection exists).
- **Seed** (`npm run db:seed`) upserts a few **`categories`** documents by `slug` for local/dev; safe to re-run.

Run migrations **after** Mongo is up (e.g. `docker compose up -d mongo` or local `mongod`). CI does **not** run migrations by default — run them in your deploy pipeline or manually.

## Docker (API + MongoDB)

```bash
docker compose up --build
```

API is exposed on **http://localhost:3000** with `MONGODB_URI` pointing at the `mongo` service.

## HTTP layout

Prefix **`API_V1_PREFIX`** (default **`/api/v1`**) is read from env in `config/env.ts`.

- **`GET /health`** — **liveness**: process is up (does **not** check MongoDB).
- **`GET /health/ready`** — **readiness**: **`200`** when Mongoose is connected (**`503`** otherwise). Point **`readinessProbe`** here (not at `/health`).
- **`GET <API_V1_PREFIX>/`** — version root / placeholder.
- **`GET <API_V1_PREFIX>/hello?name=...`** — sample **Zod**-validated query (parsed values live on **`req.validated`** because Express 5’s `req.query` is read-only).
- **`POST <API_V1_PREFIX>/auth/register`** — create user, hash password, return access + refresh tokens.
- **`POST <API_V1_PREFIX>/auth/login`** — authenticate and return access + refresh tokens.
- **`POST <API_V1_PREFIX>/auth/refresh`** — exchange refresh token for a new access token and a rotated refresh token.
- **`POST <API_V1_PREFIX>/auth/logout`** — revoke current refresh token/session.
- **`GET <API_V1_PREFIX>/auth/me`** — get current user from Bearer access token.
- **`GET <API_V1_PREFIX>/users`** — admin-only list users.
- **`GET <API_V1_PREFIX>/users/:id`** — admin-only get user by id.
- **`PATCH <API_V1_PREFIX>/users/:id/role`** — admin-only role update (`customer` / `admin`).

### Auth notes

- Access token is a JWT signed with **`JWT_ACCESS_SECRET`** and TTL **`JWT_ACCESS_TTL`** (default `15m`).
- Refresh token is a JWT signed with **`JWT_REFRESH_SECRET`** and TTL **`JWT_REFRESH_TTL`** (default `7d`).
- Send token as `Authorization: Bearer <token>`.
- Role-based access is enforced via middleware (`requireAuth`, `requireRole`).
- Refresh uses **token rotation**: each successful refresh revokes the previous refresh token/session.
- Logout revokes the provided refresh token so it can no longer mint new access tokens.
- Integration tests include the full auth lifecycle: register/login, refresh rotation, replay rejection, and logout revocation.

## CI

GitHub Actions workflow **`.github/workflows/ci.yml`** runs `npm run check` on pushes/PRs to `main` or `master`.
