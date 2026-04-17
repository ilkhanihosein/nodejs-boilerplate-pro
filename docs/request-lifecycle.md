# HTTP request lifecycle

End-to-end flow from the first application middleware on **`createApp()`** through response completion and optional error handling. Use this with [logging.md](./logging.md) and [validation.md](./validation.md).

---

## Global middleware order (`src/app.ts`)

Before the API-specific stack below, Express runs **Helmet** and **CORS** (security and browser policy). Then, in order:

| Order   | Middleware                        | Responsibility                                                                                                                                 |
| ------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | **`bindRequestContext`**          | Wall-clock start for duration (`requestStartedAtMs`), **`ensureRequestId`** (`req.id`, `X-Request-Id`), **`runWithContext`** (ALS `requestId`) |
| 2       | **`httpLogger`** (`pino-http`)    | **`genReqId` → `ensureRequestId`** (idempotent); **no** auto access/error lines (`autoLogging: false`)                                         |
| 3       | **`requestLifecycleLogger`**      | Log **start**; register **`finish` / `close`** → log **complete** with `statusCode` + `durationMs`                                             |
| 4       | **`httpRateLimiter`**             | Rate limiting                                                                                                                                  |
| 5       | **`express.json` / `urlencoded`** | Body parsers                                                                                                                                   |
| Routers | Feature routes                    | May include **`validateRequest`**, auth, controllers                                                                                           |
| Last    | **404** handler                   | Plain JSON not found                                                                                                                           |
| Final   | **`errorHandler`**                | Maps errors to responses; logs **unhandled** errors once                                                                                       |

Anything that runs **after** `bindRequestContext` and calls **`next()`** inside the same synchronous chain (and normal async continuations from that request) sees the same **ALS** store until the store is exited (end of the `runWithContext` callback wraps the whole downstream middleware chain).

---

## Step-by-step (happy path)

```
Client
  │
  ▼
┌─────────────────────────────────────┐
│ Helmet + CORS (global)              │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 1. bindRequestContext               │
│    • requestStartedAtMs = Date.now() │
│    • ensureRequestId → req.id, hdr │
│    • runWithContext(requestId)     │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 2. httpLogger (pino-http)           │
│    • genReqId / ensureRequestId    │
│    • no autoLogging lines           │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 3. requestLifecycleLogger           │
│    • LOG phase=start (info)        │
│    • register finish/close once   │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 4. Rate limit + body parsers        │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 5. Route stack                      │
│    • validateRequest (optional)     │
│      → req.validated.*              │
│    • auth / other middleware        │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 6. Controller → service → model   │
│    • getLogger() includes requestId │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 7. Response sent                    │
│    • res.on('finish'|'close')      │
│    • LOG phase=complete + duration │
└─────────────────────────────────────┘
  │
  ▼
 Client
```

---

## Error path vs success path

### A) **Zod or other handled errors** (`next(err)` before headers sent)

1. Control jumps to **`errorHandler`**.
2. Handler sends the appropriate **4xx/409** (etc.) JSON.
3. Response still ends “normally” from the server’s perspective → **`requestLifecycleLogger`** fires **complete** with that **status code** (often **`warn`** for 4xx).
4. **No** “unhandled_error” pino line for these types.

### B) **Unhandled thrown / passed error** (not `AppError` / Zod / known Mongoose cases)

1. **`errorHandler`** final branch runs.
2. **`getLogger().error(...)`** with **`phase: "error"`**, **`statusCode: 500`**, optional **`durationMs`**, and full **`err`** (stack in logs in all envs).
3. Client gets **500**; **production** body uses a **generic** error string; **non-production** may expose the message.
4. Response completes → lifecycle logs **`phase: complete`** with **`statusCode: 500`** at **`info`** (access line only—no duplicate stack there).

So: **one** detailed error log from **`errorHandler`**; **one** access completion line without embedding `err`.

### C) **`res.headersSent`**

If the handler already wrote to the response, **`errorHandler`** returns without sending or logging again—avoid corrupting the client and double logs.

---

## Duration tracking

- **`req.requestStartedAtMs`** is set **once**, at the very beginning of **`bindRequestContext`**, before **`httpLogger`** and **`requestLifecycleLogger`**.
- **Complete** and **unhandled error** logs compute **`Date.now() - requestStartedAtMs`** so duration covers the whole server-side window from correlation middleware entry, not only the lifecycle middleware’s own execution.

If `requestStartedAtMs` were ever missing (mis-ordered tests), the lifecycle logger falls back to **`durationMs: 0`**; the error handler omits **`durationMs`** when unknown.

---

## ASCII overview (compact)

```
  HTTP Request
       │
       v
 [bindRequestContext]-----> requestStartedAtMs, req.id, ALS
       │
       v
   [httpLogger]------------> idempotent req.id (pino-http)
       │
       v
 [requestLifecycleLogger]--> log START; arm finish/close
       │
       v
 [parsers / limiter / routes / validateRequest / controller]
       │
       +-----> (error?) -----> [errorHandler] -----> response
       │
       v
   response end
       │
       v
 [lifecycle COMPLETE log]--> statusCode, durationMs
```

---

## Related reading

- [logging.md](./logging.md) — pino-http vs lifecycle vs error handler
- [validation.md](./validation.md) — Zod middleware and readers
- [async-context.md](./async-context.md) — ALS usage and caveats
