# Troubleshooting

Short reference for common issues when **running** or **adapting** this boilerplate.

---

## Process exits immediately on start

**Symptom:** Node prints a Zod / validation error and exits before listening.

**Cause:** **`src/config/env.ts`** runs **`parse(process.env)`** on import. A **required** variable is missing or invalid (see [env-configuration.md](./env-configuration.md)).

**Fix:** Fill **`.env`** from **`.env.example`**, especially **`MONGODB_URI`**, **`JWT_ACCESS_SECRET`**, and **`JWT_REFRESH_SECRET`**. Fix typos in **`API_V1_PREFIX`** (must start with `/`, no `..`).

---

## Cannot connect to MongoDB

**Symptom:** `server.ts` fails during `connectMongo`, or `/health/ready` stays not ready.

**Fix:** Ensure **`MONGODB_URI`** points at a reachable host (local `mongod`, **Docker Compose** `mongo` service name, or Atlas). For Compose, use the service hostname from the same Docker network, not `127.0.0.1` from inside the API container unless you use host networking.

---

## Port already in use

**Symptom:** `EADDRINUSE` on **`PORT`**.

**Fix:** Change **`PORT`** in **`.env`** or stop the other process.

---

## Migrations or seed fail

**Symptom:** migrate-mongo or **`npm run db:seed`** errors.

**Fix:** **`MONGODB_URI`** must be valid and the database reachable. migrate-mongo config loads **`env`** via **tsx**—same rules as the app. Run migrations **after** Mongo is up.

---

## Tests fail after changing `env.ts`

**Symptom:** Vitest fails at import with env validation errors.

**Fix:** Add matching keys to **`vitest.config.ts`** → **`test.env`** for every new **required** variable.

---

## Related

- [env-configuration.md](./env-configuration.md)
- [testing.md](./testing.md)
