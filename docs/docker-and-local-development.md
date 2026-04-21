# Docker and local development

How **`docker-compose.yml`** and the **`Dockerfile`** fit together for local full-stack runs, and how that differs from **`npm run dev`** on the host.

---

## Compose layout

| Service   | Role                                                                                     |
| --------- | ---------------------------------------------------------------------------------------- |
| **mongo** | MongoDB 7, port **27017** published to the host, data in named volume **`mongo_data`**.  |
| **redis** | Redis 7 (Alpine), port **6379** on the host—optional backing store for HTTP rate limits. |
| **api**   | Image built from the repo **`Dockerfile`**, depends on **mongo** and **redis**.          |

The API container receives **`MONGODB_URI=mongodb://mongo:27017/ecommerce`** inside the Compose network (hostname **`mongo`**, not `127.0.0.1`).

**JWT secrets:** Compose reads **`JWT_ACCESS_SECRET`** and **`JWT_REFRESH_SECRET`** from your **host environment** (or a **`.env`** file next to `docker-compose.yml`—Compose variable substitution). Define them on the host before `docker compose up`; they are **not** hard-coded in the repo.

---

## Typical workflow

1. Set **`JWT_ACCESS_SECRET`** and **`JWT_REFRESH_SECRET`** in your shell or `.env` (same names as in [env-configuration.md](./env-configuration.md)).
2. Run **`docker compose up --build`**.
3. API listens on **`:3000`** (mapped to the host). Migrations and seed still use **`npm run db:*`** from the host if you point **`MONGODB_URI`** at **`mongodb://127.0.0.1:27017/ecommerce`** while the **mongo** service exposes 27017.

For **API-only** development on the machine with a local MongoDB, you usually skip Compose and use **`npm run dev`** plus **`.env`** with **`MONGODB_URI=mongodb://127.0.0.1:27017/...`**.

---

## Dockerfile (production-style image)

Multi-stage build: install deps → compile **`tsc`** → runtime image with **`npm ci --omit=dev`**, **`dist/`**, non-root user **`app`**. Default command: **`node dist/server.js`**.

The image does **not** bundle **`.env`**; inject configuration at runtime (Compose **`environment`**, Kubernetes secrets, platform env).

---

## Health endpoints (same in Compose or bare metal)

Mounted at **`/health`** (not under the versioned API prefix):

| Path                    | Purpose                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **`GET /health`**       | **Liveness** — process is up; does **not** check MongoDB (avoids restart loops when the DB is down).                                    |
| **`GET /health/ready`** | **Readiness** — returns **200** when Mongoose is connected, **503** with JSON body otherwise (for load balancers / **readinessProbe**). |

Rate limiting skips **`/health`** and **`/health/*`** (see [security-and-http-hardening.md](./security-and-http-hardening.md)).

---

## Related documents

| Topic         | Document                                                                   |
| ------------- | -------------------------------------------------------------------------- |
| Env vars      | [env-configuration.md](./env-configuration.md)                             |
| Migrations    | [database-migrations-and-seeding.md](./database-migrations-and-seeding.md) |
| When it fails | [troubleshooting.md](./troubleshooting.md)                                 |
