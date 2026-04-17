# Logging

Observability defaults for the boilerplate; adjust levels, redaction paths, or field names when you fork.

Structured logging uses **pino** as the engine. **Correlation** uses **`requestId`** on child loggers during a request. This document describes the three cooperating pieces: **pino-http** (wiring only), **lifecycle** access lines, and the **error handler** for failures.

---

## Components

### Root logger (`src/common/logger.ts`)

- **`logger`:** root **pino** instance (level from env, ISO timestamps, redaction for sensitive paths).
- **`getLogger()`:** what controllers and services should call. After **`bindRequestContext`**, returns **`logger.child({ requestId })`** using **AsyncLocalStorage**; outside a request, returns the root logger.

Structured fields (`event`, `method`, `path`, `phase`, …) are attached on each log call. **`requestId`** is on the **child** binding, not repeated inside every object, so JSON lines have a single top-level **`requestId`**.

### `pino-http` (`httpLogger` in `src/common/middlewares/http-logger.ts`)

- **Purpose:** **`genReqId`** integration with **`req.id`** / **`X-Request-Id`** via **`ensureRequestId`** (idempotent with **`bindRequestContext`**).
- **`autoLogging: false`:** pino-http does **not** emit its own request-complete or synthetic-error lines. That avoids duplicating or splitting responsibility with **`errorHandler`** (see [request-lifecycle.md](./request-lifecycle.md)).

### Lifecycle logger (`requestLifecycleLogger`)

Same file as **`httpLogger`**.

- **Start:** one **`info`** line when the middleware runs: **`phase: "start"`**, plus **`event`**, **`method`**, **`path`**.
- **Complete:** one line on **`finish`** or **`close`** (deduplicated): **`phase: "complete"`**, **`statusCode`**, **`durationMs`**.
  - **`info`:** status below 400, or 500 and above (5xx completion is still an access line, not the canonical error payload).
  - **`warn`:** 4xx client errors.

No **`err`** object on lifecycle lines.

### Error handler (`src/common/middlewares/error-handler.ts`)

- **Handled** errors (`AppError`, **`ZodError`**, known Mongoose cases, etc.): mapped to HTTP responses **without** the final “unhandled” log branch.
- **Unhandled** errors: one **`getLogger().error(...)`** with **`phase: "error"`**, **`statusCode: 500`**, optional **`durationMs`**, and full **`err`** (stack remains in logs in every environment). The **HTTP body** may still be generic in production; that does not strip log fields.

---

## Field reference

| Field        | Meaning                                                             |
| ------------ | ------------------------------------------------------------------- |
| `requestId`  | Child logger binding; aligns with **`req.id`** / **`X-Request-Id`** |
| `event`      | `http_request` on access-style lines from **`http-request-log.ts`** |
| `method`     | HTTP method                                                         |
| `path`       | `req.originalUrl`                                                   |
| `phase`      | `start` \| `complete` \| `error`                                    |
| `statusCode` | Response status when known                                          |
| `durationMs` | Wall time from **`req.requestStartedAtMs`** when set                |

---

## Example JSON (illustrative)

**Start**

```json
{
  "level": 30,
  "time": "2026-04-18T12:00:00.000Z",
  "pid": 1234,
  "env": "development",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "http_request",
  "method": "POST",
  "path": "/api/v1/items",
  "phase": "start",
  "msg": "POST /api/v1/items started"
}
```

**Complete (200)**

```json
{
  "level": 30,
  "time": "2026-04-18T12:00:00.045Z",
  "pid": 1234,
  "env": "development",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "http_request",
  "method": "POST",
  "path": "/api/v1/items",
  "phase": "complete",
  "statusCode": 200,
  "durationMs": 42,
  "msg": "POST /api/v1/items completed"
}
```

**Application log (handler or service)**

```json
{
  "level": 30,
  "time": "2026-04-18T12:00:00.020Z",
  "pid": 1234,
  "env": "development",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "resource_created",
  "resourceId": "…",
  "msg": "resource_created"
}
```

**Unhandled error (shape depends on pino serializers)**

```json
{
  "level": 50,
  "time": "2026-04-18T12:00:01.000Z",
  "pid": 1234,
  "env": "production",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "http_request",
  "method": "GET",
  "path": "/api/v1/unknown",
  "phase": "error",
  "statusCode": 500,
  "durationMs": 12,
  "err": {
    "type": "Error",
    "message": "…",
    "stack": "Error: …\n    at …"
  },
  "msg": "unhandled_error"
}
```

---

## Source files

| File                                             | Role                                           |
| ------------------------------------------------ | ---------------------------------------------- |
| `src/common/logger.ts`                           | Root pino + **`getLogger()`**                  |
| `src/common/middlewares/http-logger.ts`          | **`httpLogger`**, **`requestLifecycleLogger`** |
| `src/common/middlewares/error-handler.ts`        | Error mapping + unhandled log                  |
| `src/common/logging/http-request-log.ts`         | Shared HTTP log field objects                  |
| `src/common/context/request-context.ts`          | ALS store for **`requestId`**                  |
| `src/common/middlewares/bind-request-context.ts` | Timestamp, id, ALS                             |

See [request-lifecycle.md](./request-lifecycle.md) for **when** these run; [async-context.md](./async-context.md) for **how** `requestId` is propagated.
