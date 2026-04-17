# Architecture overview

High-level layout for this boilerplate: how HTTP entry, feature modules, shared infrastructure, and configuration fit together. **Path names** are defaults; rename, split, or delete folders as your product grows.

---

## Adapting the boilerplate

Typical first steps when starting a **new** project from this repo:

1. **Identity:** change `name`, `description`, and `version` in `package.json` (and repo remote) to match your product.
2. **Environment:** extend or shrink the Zod schema in `src/config/env.ts` and mirror variables in `.env.example`; remove JWT-related keys if you use another auth model.
3. **Features:** delete or gut `src/modules/*` samples you do not need; add `src/modules/<your-feature>/` and mount routers from `src/api/v1/routes.ts`.
4. **API surface:** keep or drop `src/api/v1/`; add `v2/` later by copying the same “thin router table” pattern if you need a new public version.
5. **Infra:** keep `health` routes if you deploy behind probes; tune `docker-compose.yml` / `Dockerfile` for your registry and runtime.
6. **Database:** keep migrate-mongo if you use MongoDB; otherwise replace migrations tooling with your own (and adjust CI/scripts).

Nothing under `src/modules/` is required for the **framework** of logging, validation, and `env`—only `app.ts` mounts and your chosen routers matter.

---

## Layers

### Versioned API surface (`src/api/v1/`)

- **Role:** Compose **public HTTP routes** for a single API version (e.g. **`/api/v1`** prefix from **`API_V1_PREFIX`** in `src/config/env.ts`).
- **Rule:** Keep this layer **thin**: mount routers, avoid domain logic.
- **Pattern:** `apiV1Router.use("/<segment>", featureRouter)` so each **feature module** owns its paths under that segment.

### Feature modules (`src/modules/<feature>/`)

- **Role:** One **bounded context** per folder: routes, controller(s), service(s), Mongoose model(s), Zod schemas as needed.
- **Boilerplate note:** any sample folders shipped here are **optional**; replace them entirely or grow from them. The shared stack in `src/common/` is what this template is mainly offering.

### Shared kernel (`src/common/`)

- Cross-cutting **middlewares** (request context, HTTP logging, rate limit, validation, errors).
- **Logger**, small **utils**, **errors** (`AppError`), optional **logging** field builders.
- **Not** a place for business rules that belong in a feature module.

### Configuration (`src/config/`)

- **`env.ts`:** single **Zod** schema over **`process.env`**, **`parse()`** on module load, **`deepFreeze`** on the exported **`env`** object. **No** scattered `process.env` reads elsewhere in app code. Variable list and defaults: [env-configuration.md](./env-configuration.md).
- **`database.ts`:** Mongoose connect/disconnect helpers used by **`server.ts`**.

### Types (`src/types/express.d.ts`)

- Global **`Express.Request`** augmentations (e.g. **`validated`**, **`id`**, **`requestStartedAtMs`**) so middleware and handlers stay typed.

---

## Operational routes

- **`/health`** — liveness (process up).
- **`/health/ready`** — readiness (e.g. database connected); use for orchestrator probes.

Mount paths for versioned APIs come from **`env.apiV1Prefix`**.

---

## Database tooling

- **Migrations:** **migrate-mongo**; config **`migrate-mongo-config.ts`** loads **`env`** via **tsx**. Changelog collection name is defined in that config.
- **Seed:** optional script under **`src/database/`**; wire your own collections and idempotent upserts.

Run migrations when the database is reachable (local **mongod**, compose service, or managed URI).

---

## Testing

- **Integration tests** under **`tests/`** use **Vitest** + **supertest** against **`createApp()`**. Details: [testing.md](./testing.md).
- **CI:** project workflow runs **`npm run check`** (format, lint, tests, build). Migrations are typically **not** run in CI unless you add a job.

---

## Related documents

| Topic                         | Document                                       |
| ----------------------------- | ---------------------------------------------- |
| Env keys and defaults         | [env-configuration.md](./env-configuration.md) |
| Running and writing tests     | [testing.md](./testing.md)                     |
| Common failures               | [troubleshooting.md](./troubleshooting.md)     |
| Request order, middleware     | [request-lifecycle.md](./request-lifecycle.md) |
| Logging components            | [logging.md](./logging.md)                     |
| Request body/query validation | [validation.md](./validation.md)               |
| Correlation id / ALS          | [async-context.md](./async-context.md)         |
