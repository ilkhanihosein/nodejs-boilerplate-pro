# HTTP request lifecycle

Global middleware order is **stable infrastructure**—change it only when you know how it affects logging, ALS, and error handling.

Order of execution from **`createApp()`** through the response and optional **`errorHandler`**. For **log line shapes and responsibilities**, see [logging.md](./logging.md) (this file does not duplicate that content).

---

## Middleware sequence (`src/app.ts`)

After **Helmet** and **CORS**:

| Step | Middleware                            | Responsibility                                                                                                                                 |
| ---- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **`bindRequestContext`**              | **`requestStartedAtMs`**, **`ensureRequestId`** → **`req.id`**, **`X-Request-Id`**, **`runWithContext(requestId)`** (ALS)                      |
| 2    | **`httpLogger`** (`pino-http`)        | **`genReqId`** / **`ensureRequestId`** (idempotent); **`autoLogging: false`**                                                                  |
| 3    | **`requestLifecycleLogger`**          | Log **`phase: "start"`**; register **`finish`** / **`close`** → one **`phase: "complete"`** line                                               |
| 4    | **`httpRateLimiter`**                 | Rate limiting                                                                                                                                  |
| 5    | **`express.json`** / **`urlencoded`** | Body parsing                                                                                                                                   |
| —    | Feature routers                       | Optional **`validateRequest`**, auth, controllers                                                                                              |
| —    | **404** handler                       | JSON not found                                                                                                                                 |
| last | **`errorHandler`**                    | Map errors to responses (see [errors-and-json-responses.md](./errors-and-json-responses.md)); **unhandled** branch logs once (see logging doc) |

Downstream code that runs inside the same **`runWithContext`** callback sees the same ALS store for the lifetime of that request chain (subject to async caveats in [async-context.md](./async-context.md)).

---

## Happy path (ASCII)

```
Client
  │
  ▼
┌─────────────────────┐
│ Helmet + CORS       │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ bindRequestContext  │
│ time + req.id + ALS │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ httpLogger          │
│ (id wiring only)    │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ requestLifecycle    │
│ LOG start           │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ limiter + parsers   │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ routes / validate   │
│ controller / service│
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ response end        │
│ LOG complete        │
└─────────────────────┘
  │
  ▼
 Client
```

---

## Success vs error

### Handled error (`next(err)` before headers sent)

Control passes to **`errorHandler`**, which sends the appropriate status and JSON. The response still completes normally → **lifecycle** logs **`complete`** with that status (often **`warn`** for 4xx). **No** final “unhandled” error log line for those types.

### Unhandled error

**`errorHandler`** final branch: HTTP **500**, one structured **error** log with full **`err`** (see [logging.md](./logging.md)). Lifecycle still logs **`complete`** with status **500** at **`info`** (access line only—no stack there).

### Headers already sent

If **`res.headersSent`**, **`errorHandler`** does not send again or double-log.

---

## Duration

- **`req.requestStartedAtMs`** is set at the start of **`bindRequestContext`**, before logging middleware.
- **`durationMs`** on **complete** (and on **unhandled** error logs when present) uses wall time from that timestamp.

If the timestamp were missing (e.g. tests without **`bindRequestContext`**), lifecycle uses **`durationMs: 0`**; the error handler may omit **`durationMs`**.

---

## Compact pipeline

```
  HTTP Request
       │
       v
 [bindRequestContext]
       │
       v
   [httpLogger]
       │
       v
 [requestLifecycleLogger] --> START
       │
       v
 [limiter / parsers / routes / validateRequest / handler]
       │
       +-----> error? --> [errorHandler] --> response
       │
       v
   response end --> COMPLETE (access log)
```

---

## See also

- [logging.md](./logging.md)
- [validation.md](./validation.md)
- [async-context.md](./async-context.md)
- [architecture.md](./architecture.md)
