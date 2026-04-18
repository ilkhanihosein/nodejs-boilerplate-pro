# HTTP API boilerplate

**Node.js 20+**, **TypeScript**, **Express 5**, **MongoDB** (Mongoose) starter for JSON HTTP APIs: validated config, structured logging, security defaults, rate limiting, centralized errors, versioned routing, tests (**Vitest** + **supertest**), optional **Docker Compose** with MongoDB.

**Stack:** Express, Mongoose, Zod (config + request parsing), pino, migrate-mongo.

**Using this as a base:** clone or fork, then **rename** the package in `package.json`, **trim or replace** anything under `src/modules/` you do not need, **adjust** `src/config/env.ts` and `.env.example` for your env vars, and **rewire** `src/api/v1/routes.ts` to your feature routers. The sample layout is a starting point—not a product you must keep.

---

## Documentation

All architecture and system behavior are documented under **[`docs/`](./docs)**. Start at **[`docs/README.md`](./docs/README.md)** (index: architecture, auth, CI/hooks, database migrations/seed, Docker/local dev, env, errors, testing, troubleshooting, security, logging, validation, lifecycle, async context).

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

## Quick start

1. Copy **`.env.example`** to **`.env`** and set every variable marked required there (including database URI and signing secrets used by the template).
2. **`npm install`**
3. **`npm run dev`** — listens on **`PORT`** (default **3000**).

Invalid or missing required env values cause the process to exit on startup when **`src/config/env.ts`** loads.

---

## Scripts

| Script                                | Purpose                        |
| ------------------------------------- | ------------------------------ |
| `npm run dev`                         | `tsx watch` on `src/server.ts` |
| `npm run build`                       | Compile to `dist/`             |
| `npm start`                           | Run `dist/server.js`           |
| `npm test` / `npm run test:ci`        | Vitest                         |
| `npm run check`                       | format + lint + tests + build  |
| `npm run db:migrate`                  | Apply database migrations      |
| `npm run db:migrate:down`             | Roll back last migration       |
| `npm run db:migrate:status`           | Migration status               |
| `npm run db:migrate:create -- <name>` | Scaffold migration             |
| `npm run db:seed`                     | Run optional seed script       |

---

## Docker

```bash
docker compose up --build
```

Brings up the **API** and **MongoDB**. Point **`MONGODB_URI`** in **`.env`** at the database service. For local compose, secrets are often read from **`.env`**.

**Production:** supply configuration and secrets through your infrastructure (secret managers, orchestrator env, etc.). **`.env`** files are for **local development** only.

---

## Documentation is the source of truth

Behavior, middleware order, logging, validation, async context, migrations, Docker/health, security defaults, auth, error JSON, and CI/hooks are described in **`/docs`**. This README is onboarding and navigation—not a duplicate of those details.
