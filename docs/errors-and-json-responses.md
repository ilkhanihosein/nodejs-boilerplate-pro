# Errors and JSON responses

Central **`errorHandler`** in **`src/common/middlewares/error-handler.ts`** turns thrown errors into JSON bodies. Success responses are chosen per handler (this document focuses on **errors** and **404**).

All bodies emitted by **`errorHandler`** include **`apiVersion`** (from **`env.apiVersion`**, driven by **`API_VERSION`** / default **`1`**) so clients can correlate errors with a deployed API revision.

---

## Application errors (`AppError`)

Thrown from services and **`requireAuth`** / **`requireRole`** when you want a stable client contract:

```json
{
  "error": "Human-readable message",
  "code": "machine_readable_code",
  "apiVersion": "1"
}
```

**`statusCode`** on **`AppError`** becomes the HTTP status (for example **401**, **403**, **404**).

---

## Validation (`ZodError`)

**`validateRequest`** / handler-level Zod failures:

```json
{
  "error": "Validation failed",
  "code": "validation_error",
  "apiVersion": "1",
  "details": [
    /* Zod issue objects */
  ]
}
```

HTTP **400**.

---

## Mongoose

- **`CastError`** → **400**, **`{ "error": "Invalid identifier", "code": "bad_request" }`**.
- **`ValidationError`** → **422**, **`code`**: **`validation_error`**, **`fields`**: array of invalid paths.
- **Duplicate key** (code **11000**) → **409**, **`code`**: **`conflict`**.

---

## Unknown errors

Unhandled errors log with **`unhandled_error`** (see [logging.md](./logging.md)). Response:

- **Production:** **`500`**, generic **`Internal Server Error`**, **`code`**: **`internal_error`**.
- **Non-production:** **`500`** with the underlying **`Error.message`** when available (easier local debugging).

---

## Not found

Routes that do not match any registered handler hit the **404** middleware in **`app.ts`**:

```json
{ "error": "Not Found", "code": "not_found" }
```

For paths under **`API_V1_PREFIX`**, the same body includes **`apiVersion`** (from **`API_VERSION`**, default **`1`**) so clients can tell which contract they hit.

Other paths (e.g. **`/old-path`**) use the same **`code`** but omit **`apiVersion`** unless you extend the middleware.

---

## Related documents

| Topic             | Document                                                                     |
| ----------------- | ---------------------------------------------------------------------------- |
| Middleware order  | [request-lifecycle.md](./request-lifecycle.md)                               |
| Validation helper | [validation.md](./validation.md)                                             |
| Auth error codes  | [authentication-and-authorization.md](./authentication-and-authorization.md) |
