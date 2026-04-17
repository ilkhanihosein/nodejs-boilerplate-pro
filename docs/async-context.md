# Async context (`AsyncLocalStorage`)

Same pattern many HTTP services use; keep **`bindRequestContext`** early in `app.ts` if you rely on **`getLogger()`** correlation.

Node’s **`AsyncLocalStorage`** (ALS) carries **`requestId`** for the duration of a request so **`getLogger()`** can attach **`logger.child({ requestId })`** without passing **`req`** into every service function.

---

## Store

**File:** `src/common/context/request-context.ts`

- Store: **`{ requestId: string }`**.
- **`getRequestId()`** returns that string, or **`undefined`** outside **`storage.run`**.

---

## Who sets the store

**`bindRequestContext`** (`src/common/middlewares/bind-request-context.ts`):

1. Sets **`req.requestStartedAtMs`**.
2. Calls **`ensureRequestId(req, res)`** from **`request-id.ts`** → sets **`req.id`**, echoes **`X-Request-Id`**.
3. Calls **`runWithContext(requestId, () => next())`** so the rest of the middleware chain runs inside the store.

The value stored in ALS matches **`req.id`** after **`ensureRequestId`**.

---

## `req.id` vs ALS (different jobs)

| Mechanism           | Role                                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`req.id`**        | HTTP-level correlation: compatible with **`pino-http`** / **`IncomingMessage`**, returned as **`X-Request-Id`**, can be read from **`req`** in any code that has the request object.                           |
| **ALS `requestId`** | Application-wide default for **`getLogger()`** when **`req`** is not in scope (e.g. deep in a service). **Source of truth for “current request” in logging** is the ALS value set in **`bindRequestContext`**. |

**`getLogger()`** reads **ALS**, not **`req`**. In normal Express handling after **`bindRequestContext`**, **`getRequestId()`** and **`req.id`** refer to the same string.

---

## Consumers

- **`getLogger()`** — child binding **`{ requestId }`** when **`getRequestId()`** is defined.
- **`runWithContext`** — optional: wrap background work that must keep the same **`requestId`** (see JSDoc on **`runWithContext`**).

---

## Limitations

1. **Async boundaries:** Work scheduled on a **different** async context (some queues, forgotten `runWithContext`) may **lose** the store unless you re-bind or pass **`requestId`** explicitly.
2. **Middleware order:** Handlers and services only get automatic **`requestId`** on logs if **`bindRequestContext`** runs first in **`createApp()`** (as in this boilerplate).
3. **Tests:** Mounting **`createApp()`** preserves order; unit tests that invoke handlers without the full app stack need to set context themselves if they assert on log fields.

---

## Related

- [request-lifecycle.md](./request-lifecycle.md)
- [logging.md](./logging.md)
