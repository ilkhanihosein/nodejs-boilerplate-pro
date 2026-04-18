# Database migrations and seeding

This boilerplate uses **migrate-mongo** for versioned schema changes and an optional **TypeScript seed** script for reference data in development.

---

## Prerequisites

- **MongoDB reachable** before you run migrations or seed (local `mongod`, `docker compose`, or a managed URI).
- **`MONGODB_URI`** must include a **database path** (for example `mongodb://localhost:27017/ecommerce`). The migrate config parses the database name from that path; a URI without a database segment will fail at config load time.

Env parsing and required keys: [env-configuration.md](./env-configuration.md).

---

## Migrations (migrate-mongo)

| Item            | Location / value                                                                       |
| --------------- | -------------------------------------------------------------------------------------- |
| Config          | **`migrate-mongo-config.ts`** at repo root (loads **`env`** from `src/config/env`)     |
| Migration files | **`migrations/`** — **`.js`** files, **ESM** (`export const up` / `export const down`) |
| State           | Collections **`migration_changelog`** and **`migration_changelog_lock`** (see config)  |

### npm scripts

| Command                               | Purpose                       |
| ------------------------------------- | ----------------------------- |
| `npm run db:migrate`                  | Apply pending migrations      |
| `npm run db:migrate:down`             | Roll back the last migration  |
| `npm run db:migrate:status`           | Show status                   |
| `npm run db:migrate:create -- <name>` | Scaffold a new migration file |

The underlying CLI is **migrate-mongo**; flags after `--` are passed through to **`create`**.

### Authoring a migration

1. Run **`npm run db:migrate:create -- descriptive-name`** (or copy an existing file under **`migrations/`**).
2. Implement **`up`** and **`down`** against the native driver **`Db`** (same style as the sample migration in this repo).
3. Test **`up`** then **`down`** on a disposable database when possible.

**CI:** the default workflow does **not** run migrations. Add a job only if you intentionally migrate a database from CI (non-local), and document secrets and safety (for example dry-run vs prod).

---

## Seeding

| Item     | Detail                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------- |
| Script   | **`src/database/seed.ts`** — loads **dotenv**, connects via **`connectMongo`**, runs idempotent upserts |
| Command  | **`npm run db:seed`**                                                                                   |
| Contract | Treat as **dev/reference data**; make operations **idempotent** (upserts) if you re-run often           |

Seeding is **independent** of migrate-mongo: run it **after** Mongo is up; order relative to migrations depends on your data model (migrations first if seed assumes indexes/collections exist).

---

## Related documents

| Topic             | Document                                       |
| ----------------- | ---------------------------------------------- |
| Env and URI rules | [env-configuration.md](./env-configuration.md) |
| When things fail  | [troubleshooting.md](./troubleshooting.md)     |
| Where this fits   | [architecture.md](./architecture.md)           |
