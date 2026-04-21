# Professional Node.js / HTTP API boilerplate requirements

This document is a **team contract** for how “production-grade” this backend starter is meant to be, and **how to execute against it**. Items are **not tied to a single product vertical** (e.g. only e-commerce); any API project can grow its own modules underneath.

**How to use the levels**

- **Must:** Without these, do not claim a production-ready boilerplate.
- **Should:** Needed for multiple teams/environments or horizontal scale soon; if omitted, state explicitly in README/docs that it was intentional.
- **Could:** Depends on product type; ship as an **optional add-on** or **migration guide** in docs.
- The **Status in this repo** column tracks alignment with the current codebase—update it as you close gaps.

The tables from **section 1 onward** are the normative requirement matrix. The **Gaps** section below is the **same concrete backlog for this repository**: not implemented yet (or only warned about in docs), and what the team drives against.

---

## Gaps and work not done yet

**“Any kind of project”** here means a mix of simple APIs, e-commerce, background jobs, files, realtime, and multi-database setups. It is normal not to put everything in one repo. **Professional** means either an **optional module** or a **documented contract** for each hole. The following are **missing or incomplete** in this repo.

### 1. API contract and consumer experience

- **OpenAPI 3** — **Partially done:** Swagger UI at **`/docs`**; spec **generated from Zod** in **`src/api/v1/openapi.ts`** via **`@asteasolutions/zod-to-openapi`** (request shapes reuse validation schemas). **CI:** **`npm run openapi:check`** (in **`npm run check`**) fails if **`generated/openapi.json`** drifts from **`buildOpenApiV1Document()`**; regenerate with **`npm run openapi:generate`**. **Still open:** splitting large path lists per module (if registries grow), and tightening any remaining **response** schemas.
- **API version** — **Done:** **`X-API-Version`** on all responses under the versioned API router; **`apiVersion`** on **`errorHandler`** JSON, **`/health`**, **`/health/ready`**, sample **`GET`** handlers under v1, and **404** under **`API_V1_PREFIX`**. Configure with **`API_VERSION`** (default **`1`**). Optional **`GIT_SHA`** on health for deploys.
- **Pagination / filtering / sorting** — **Partially done:** shared **offset** and **cursor** query schemas + **`resolveOffsetPagination`** in **`src/common/http/offset-pagination.ts`**. **Still open:** a documented **sort** convention and adoption on real list endpoints (wire `validateRequest` + these schemas).

### 2. Observability and operations

- **Tracing + Prometheus metrics** — **Done (opt-in via env, default off):** OpenTelemetry (`NodeSDK`: HTTP, Express, MongoDB) with **`http.route`** / **`app.http.status_type`** aligned to the same helpers as metrics; pino log fields **`traceId`** / **`spanId`** when tracing is on. **`GET /metrics`** exposes **`http_requests_total`**, **`http_request_duration_seconds`**, **`http_requests_in_flight`** (see **`docs/observability.md`**). **Still open:** optional **APM** (e.g. Sentry), **tail sampling** on the collector, and any team-specific dashboards or alerts.

### 3. Security and multi-instance production

- **In-memory rate limiting** — **Done (optional Redis):** set **`RATE_LIMIT_REDIS_URL`** to **`redis://`** or **`rediss://`** for **`rate-limit-redis`** + **`node-redis`** in **`server.ts`**; Compose includes a **`redis`** service (uncomment **`RATE_LIMIT_REDIS_URL`** on **`api`** when needed). Single-instance default remains in-memory.
- **Dependabot / Renovate** for dependencies.
- Run **`npm audit`** (or equivalent) in CI with an explicit policy (fail vs report-only).
- If **cookies / sessions** are added later, document **CSRF** and the threat model; today JWT Bearer is the pattern and is common for SPAs.

### 4. A “general” data layer

- Being locked to **MongoDB + Mongoose** is limiting for “any project”; add a clear **repository layer** + doc for **SQL/Prisma migration**, or a **separate variant** in the README.
- **Transaction / idempotency** patterns for sensitive operations (e.g. payments/orders in commercial products); in the boilerplate, ship as **general documented pattern or a small sample**.

### 5. Capabilities many products need (not in this skeleton)

- **Queues and background jobs** (BullMQ + Redis, or at least an outbox pattern).
- **Scheduling** (in-process cron or a separate worker).
- **File upload** (multipart + type/size limits + optional cloud storage).
- **Realtime** (WebSocket or SSE)—if you market the boilerplate “for everyone”, it belongs on the work plan.
- **Email / notifications** (templates + send queue).
- **Response compression** (`compression`) for large JSON payloads.

### 6. Testing and delivery quality

- **Coverage thresholds** (Vitest coverage + minimum % in CI).
- **API contract** tests or OpenAPI-derived smoke tests (optional but valuable).
- **Load testing** / k6 as a separate script (even a tiny example).

### 7. Release and deployment

- **Build/push image** workflow to a registry, **semver tags**, **CHANGELOG**—today CI only runs `check` on PRs.
- Sample **Helm chart** or **minimal Kubernetes manifests** for teams that do not use Compose.
- **`.nvmrc`** / **`engines` aligned with CI** (CI uses Node 22 while `engines` is only `>=20`; pin one version for the team).

### 8. Repository identity as a generic boilerplate

- **README** still reads “HTTP API boilerplate” while **`package.json`** uses an e-commerce name; for a public fork, use a **single name/description** and a short **“how to strip the users/auth sample”** section at the top of the README.

---

## 1. Runtime and language

| ID   | Requirement                                                | Level | Acceptance (summary)                                        | Status in this repo                                                    |
| ---- | ---------------------------------------------------------- | ----- | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| R1.1 | Pinned Node (LTS) and CI alignment                         | Must  | `engines` + workflow on the same line; not “any Node works” | Partial: CI on 22, `engines` only `>=20`—tighter alignment is a Should |
| R1.2 | TypeScript strict mode                                     | Must  | `strict` and no silent `any` per team rules                 | Done                                                                   |
| R1.3 | ESM module graph and clear resolution                      | Must  | `"type": "module"` or equivalent; consistent imports        | Done                                                                   |
| R1.4 | Standard scripts (`dev`, `build`, `start`, `test`, `lint`) | Must  | README one-screen quick start                               | Done                                                                   |

---

## 2. Configuration and secrets

| ID   | Requirement                                  | Level  | Acceptance                    | Status in this repo |
| ---- | -------------------------------------------- | ------ | ----------------------------- | ------------------- |
| R2.1 | Single validated env surface                 | Must   | One schema; fail fast at boot | Done (Zod)          |
| R2.2 | Complete `.env.example` without real secrets | Must   | Every required key explained  | Done                |
| R2.3 | No scattered `process.env` in app code       | Should | Only the config layer         | Pattern followed    |

---

## 3. HTTP layer and API contract

| ID   | Requirement                                                     | Level  | Acceptance                                             | Status in this repo                                                           |
| ---- | --------------------------------------------------------------- | ------ | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| R3.1 | Versioned public API prefix                                     | Should | e.g. configurable `/api/v1`                            | Done                                                                          |
| R3.2 | Consistent JSON error shape (code, message, optional `details`) | Must   | Predictable validation and 404 behavior                | Done                                                                          |
| R3.3 | Edge validation (body/query/params)                             | Must   | One pattern across the codebase                        | Done                                                                          |
| R3.4 | Documented pagination/filter contract (pattern or helper)       | Should | Docs or sample code; front-end does not guess          | Partial: `src/common/http/offset-pagination.ts`; sort + real lists still open |
| R3.5 | OpenAPI (or equivalent) for v1                                  | Should | Generated or hand-maintained; CI can validate artifact | Partial: `/docs` + Zod-driven `openapi.ts`; CI/spec sync still open           |
| R3.6 | Body size limits and content handling                           | Must   | Protection against huge payloads                       | Done                                                                          |

---

## 4. HTTP security and web attack surface

| ID   | Requirement                                             | Level  | Acceptance                    | Status in this repo                                                                               |
| ---- | ------------------------------------------------------- | ------ | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| R4.1 | Baseline security headers (Helmet or equivalent)        | Must   | —                             | Done                                                                                              |
| R4.2 | Per-environment CORS                                    | Must   | Safe production defaults      | Done                                                                                              |
| R4.3 | Rate limiting with health exclusions                    | Must   | —                             | Done                                                                                              |
| R4.4 | Configurable `trust proxy` for real client IP behind LB | Must   | Documented                    | Done                                                                                              |
| R4.5 | Shared store for rate limit across replicas             | Should | Redis or “how to plug in” doc | Done: **`RATE_LIMIT_REDIS_URL`** + **`connect-rate-limit-redis.ts`**; Compose **`redis`** service |
| R4.6 | Dependency automation (Dependabot / audit in CI)        | Should | Clear fail vs warn policy     | Dependabot not configured; audit not in CI                                                        |

---

## 5. Logging, request tracing, runtime errors

| ID   | Requirement                                           | Level | Acceptance                         | Status in this repo                                                                                   |
| ---- | ----------------------------------------------------- | ----- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| R5.1 | Structured logging (JSON in prod)                     | Must  | —                                  | Done (pino)                                                                                           |
| R5.2 | Request id in header and logs                         | Must  | Debug correlation                  | Done                                                                                                  |
| R5.3 | Policy for `unhandledRejection` / `uncaughtException` | Must  | Log + exit or explicit team policy | Done                                                                                                  |
| R5.4 | Metrics or tracing (Prometheus / OTel)                | Could | For serious production             | Done (off by default): **`docs/observability.md`**; single-path HTTP metrics + OTel + log correlation |

---

## 6. Process lifecycle and deployment

| ID   | Requirement                             | Level  | Acceptance               | Status in this repo |
| ---- | --------------------------------------- | ------ | ------------------------ | ------------------- |
| R6.1 | Clean shutdown (HTTP + DB + timeout)    | Must   | No hang on deploy        | Done                |
| R6.2 | Separate liveness and readiness         | Must   | Readiness checks DB/deps | Done                |
| R6.3 | Multi-stage non-root Dockerfile         | Must   | Non-root runtime user    | Done                |
| R6.4 | Example Compose for dev/staging         | Should | —                        | Done                |
| R6.5 | CI: clean install + lint + test + build | Must   | Runs on PR               | Done                |
| R6.6 | Image publish / semver / changelog      | Could  | For OSS or multi-env     | Not done            |

---

## 7. Database and data

| ID   | Requirement                                       | Level  | Acceptance                    | Status in this repo            |
| ---- | ------------------------------------------------- | ------ | ----------------------------- | ------------------------------ |
| R7.1 | Migration tool with npm scripts                   | Should | Every schema change tracked   | Done (migrate-mongo)           |
| R7.2 | Optional documented seed                          | Could  | —                             | Done                           |
| R7.3 | Data access boundary (repository) for swapping DB | Could  | Helps a “generic” boilerplate | Partial—mostly direct Mongoose |

---

## 8. Authentication and authorization (sample, removable)

| ID   | Requirement                                                                        | Level  | Acceptance                        | Status in this repo                 |
| ---- | ---------------------------------------------------------------------------------- | ------ | --------------------------------- | ----------------------------------- |
| R8.1 | Sample auth with a safe pattern (e.g. JWT + refresh rotation) **or** “no auth” doc | Should | Team knows what is sample vs core | Done (JWT sample)                   |
| R8.2 | Extensible roles/permissions                                                       | Could  | —                                 | Sample (`requireRole`) + unit tests |

---

## 9. Testing and code quality

| ID   | Requirement                                               | Level  | Acceptance            | Status in this repo        |
| ---- | --------------------------------------------------------- | ------ | --------------------- | -------------------------- |
| R9.1 | API integration tests without mandatory external services | Must   | In-memory DB or mocks | Done                       |
| R9.2 | Pre-commit or equivalent (format/lint on staged)          | Should | —                     | Done (husky + lint-staged) |
| R9.3 | Coverage thresholds in CI                                 | Could  | —                     | Not done                   |

---

## 10. Documentation and onboarding

| ID    | Requirement                                           | Level  | Acceptance                                   | Status in this repo |
| ----- | ----------------------------------------------------- | ------ | -------------------------------------------- | ------------------- |
| R10.1 | Short README + deep docs index                        | Must   | —                                            | Done                |
| R10.2 | Architecture + env + security + testing + deploy docs | Must   | —                                            | Done                |
| R10.3 | Boilerplate requirements / gap doc (this file)        | Should | Single place for “deliberately out of scope” | This document       |

---

## 11. Optional extension points (Could)

Details are under **[Gaps → §5 “Capabilities many products need”](#5-capabilities-many-products-need-not-in-this-skeleton)** and in other **Could** rows in the tables above. If you deliberately omit something, add a one-liner in the README: **“Out of scope for this boilerplate.”**

---

## How to prioritize

1. Turn every **Must** row green per area (or document an explicit exception in the README).
2. Then **Should** items that matter for **your** real deployment (e.g. R4.5 if you run multiple pods, R3.5 if you have a separate front-end team).
3. Push **Could** items to product backlog or a separate extension repo so the boilerplate does not bloat.

After each boilerplate milestone, update the **Status in this repo** column in a small PR so this file stays truthful.
