# Async context (`AsyncLocalStorage`)

This service uses Node’s **`AsyncLocalStorage`** (ALS) to propagate **`requestId`** for **`getLogger()`** without threading `req` through every function.

---

## What is stored

**File:** `src/common/context/request-context.ts`

- Store shape: **`{ requestId: string }`**.
- **`getRequestId()`** returns the current store’s `requestId`, or **`undefined`** outside a bound context.

---

## Who sets it

**`bindRequestContext`** (`src/common/middlewares/bind-request-context.ts`):

1. Sets **`req.requestStartedAtMs`**.
2. Calls **`ensureRequestId(req, res)`** → assigns **`req.id`**, sets **`X-Request-Id`** header.
3. Calls **`runWithContext(requestId, () => next())`** so the **entire remainder** of the middleware chain (and typical async work **continued** from that same execution path) runs inside the store.

The string passed to ALS is the same as **`req.id`** after `ensureRequestId`.

---

## Who consumes it

- **`getLogger()`** — when `getRequestId()` is defined, returns **`rootLogger.child({ requestId })`** so child loggers automatically include the correlation field.
- **`runWithContext`\*\*** — may be used elsewhere if you intentionally run background work that should **inherit** or **re-bind** the same id (see export JSDoc on `runWithContext`).

---

## Safety and limitations (senior-level mental model)

1. **Boundaries:** ALS follows **async resources** created while running inside `storage.run`. Code that **queues** work on a **different** async chain (some pool APIs, fire-and-forget without care) might **not** inherit the store unless you wrap that work with **`runWithContext(requestId, () => …)`** (or pass `req` / id explicitly).

2. **Order:** Anything that calls **`getLogger()`** and expects **`requestId`** must run **after** **`bindRequestContext`** on the real HTTP app. The **`createApp()`** factory wires this early; custom tests that mount handlers without `bindRequestContext` will not get automatic `requestId` on logs.

3. **No magic on `req` alone:** `getLogger()` reads **ALS**, not `req`. In normal Express handling, **`getRequestId()`** and **`req.id`** match because **`bindRequestContext`** sets both before downstream code runs.

---

## Related

- [request-lifecycle.md](./request-lifecycle.md) — where ALS fits in the middleware stack
- [logging.md](./logging.md) — how `requestId` appears on log lines
