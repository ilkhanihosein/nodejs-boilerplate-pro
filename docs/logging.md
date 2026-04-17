# Logging architecture

This document describes how structured logging works in this API: **pino** as the engine, **pino-http** for correlation wiring only, a **lifecycle** middleware for access-style lines, and the **central error handler** for application errors with full stack traces in logs.

---

## Goals

- One **correlation id** per HTTP request (`requestId`), visible on every log line during that request.
- **Access logs**: request start and request complete with **duration** and **status**, **without** embedding error stacks (avoids duplicate noise with the error handler).
- **Error logs**: unhandled failures logged **once**, with **full `err` serialization** (including stack) in **all** environments—including production. Only the **JSON response** to the client is sanitized in production.

---

## Components

### 1. Root logger (`src/common/logger.ts`)

- **`rootLogger`**: a single **pino** instance with level from env, ISO timestamps, and **redaction** of sensitive paths (e.g. `Authorization`, `Cookie`, password fields in bodies).
- **`logger`**: exported alias of `rootLogger`, passed into **pino-http** so generated request ids stay on the same pino tree.
- **`getLogger()`**: the logger application code should use. After **`bindRequestContext`**, it returns **`rootLogger.child({ requestId })`** where `requestId` comes from **AsyncLocalStorage** (`getRequestId()`). Outside a request (e.g. bootstrap), it returns the root logger with no child binding.

**Important:** Structured fields such as `event`, `method`, `path`, `phase`, `statusCode`, `durationMs` are attached on each **log call**. The **`requestId`** key is attached via the **child logger bindings**, not duplicated inside those objects—so each JSON line has exactly one top-level `requestId`.

### 2. `pino-http` (`httpLogger` in `src/common/middlewares/http-logger.ts`)

**Why it exists:** `pino-http` integrates with Node’s `IncomingMessage` / `req.id` conventions and provides **`genReqId`**.

**What we disable:** **`autoLogging: false`**. We do **not** use pino-http’s automatic “request completed / errored” lines. Those would fire on **5xx** synthetic paths and would **duplicate** or **split** error detail relative to our **`errorHandler`**.

**What remains:** On each request, the middleware still runs **`genReqId`**, which calls **`ensureRequestId(req, res)`** so **`req.id`** and the **`X-Request-Id`** response header stay aligned with **`bindRequestContext`** (idempotent if the id was already set).

So: **pino-http = request id wiring + compatibility**, not access or error log semantics.

### 3. Lifecycle logger (`requestLifecycleLogger`)

**Role:** Emit **two** structured lines per successful pipeline:

1. **Start** — when the middleware runs: `phase: "start"`, plus shared HTTP fields (`event`, `method`, `path`).
2. **Complete** — on **`finish`** or **`close`** (whichever completes the response first; guarded so we only log once): `phase: "complete"`, **`statusCode`**, **`durationMs`**.

**Levels:**

- **`info`**: completion with status **below 400** or **500 and above** (5xx completion is still an “access” line, not the canonical error payload).
- **`warn`**: completion with **4xx** client errors.

**No `err` object** on these lines—by design. Stack traces and full errors for **unhandled** failures belong only in **`errorHandler`**.

### 4. Error handler (`src/common/middlewares/error-handler.ts`)

**Handled errors** (mapped to HTTP responses): `AppError`, `ZodError`, Mongoose cast/validation, duplicate key, etc. These **do not** emit the generic “unhandled” pino **error** line.

**Unhandled errors** (fall through to the final branch):

- Logs **`getLogger().error({ ...httpRequestLogBase(req), phase: "error", statusCode: 500, durationMs?, err }, "unhandled_error")`**.
- **`err`** is always the raw value passed to Express—so **production logs still contain stacks** where pino’s serializers include them.
- **`res.status(500).json(...)`**: in **production**, the **`error`** string in the JSON body is generic; in **non-production**, the client may see the underlying message. This is **response** policy only; it does not strip log fields.

---

## Field standardization

| Field        | Where it appears                                    | Notes                                    |
| ------------ | --------------------------------------------------- | ---------------------------------------- |
| `requestId`  | Child logger binding from `getLogger()`             | Same id as `req.id` / `X-Request-Id`     |
| `event`      | `http_request` on access-style lines                | From `httpRequestLogBase`                |
| `method`     | HTTP method                                         | e.g. `GET`, `POST`                       |
| `path`       | `req.originalUrl`                                   | Includes query string when present       |
| `phase`      | `start` \| `complete` \| `error`                    | Lifecycle vs error-handler               |
| `statusCode` | `complete` and `error` (500) lines                  | From `res.statusCode` when complete      |
| `durationMs` | `complete` line; `error` line when start time known | Wall clock from `req.requestStartedAtMs` |

---

## Example log lines (illustrative JSON)

**Request start** (fields merged with pino base + child bindings):

```json
{
  "level": 30,
  "time": "2026-04-18T12:00:00.000Z",
  "pid": 1234,
  "env": "development",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "http_request",
  "method": "POST",
  "path": "/api/v1/auth/login",
  "phase": "start",
  "msg": "POST /api/v1/auth/login started"
}
```

**Request complete** (200):

```json
{
  "level": 30,
  "time": "2026-04-18T12:00:00.045Z",
  "pid": 1234,
  "env": "development",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "http_request",
  "method": "POST",
  "path": "/api/v1/auth/login",
  "phase": "complete",
  "statusCode": 200,
  "durationMs": 42,
  "msg": "POST /api/v1/auth/login completed"
}
```

**Application log inside a handler** (e.g. service):

```json
{
  "level": 30,
  "time": "2026-04-18T12:00:00.020Z",
  "pid": 1234,
  "env": "development",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "user_registered",
  "userId": "…",
  "msg": "user_registered"
}
```

**Unhandled error** (abbreviated; `err` shape depends on pino serializers):

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

## Related files

| File                                             | Purpose                                              |
| ------------------------------------------------ | ---------------------------------------------------- |
| `src/common/logger.ts`                           | Root pino + `getLogger()`                            |
| `src/common/middlewares/http-logger.ts`          | `httpLogger` + `requestLifecycleLogger`              |
| `src/common/middlewares/error-handler.ts`        | Central error mapping + unhandled log                |
| `src/common/logging/http-request-log.ts`         | Shared `event` / `method` / `path` + complete fields |
| `src/common/context/request-context.ts`          | ALS store for `requestId`                            |
| `src/common/middlewares/bind-request-context.ts` | Id + ALS + `requestStartedAtMs`                      |

See also: [request-lifecycle.md](./request-lifecycle.md), [async-context.md](./async-context.md).
