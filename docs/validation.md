# Request validation (Zod)

These patterns are **reusable defaults**; you can keep them for every new route or wrap them differently in your own codebase.

**Zod** runs **once** in middleware. Handlers read **trusted** values from **`req.validated`** using small **reader** helpers and TypeScript generics—**no** second **`parse`** in controllers.

---

## `validateRequest` middleware

**File:** `src/common/middlewares/validate-request.ts`

**Route usage:**

```ts
router.post("/items", validateRequest({ body: createItemBodySchema }), createItemHandler);
// optional: query:, params:
```

**Behavior:**

1. Ensures **`req.validated`** exists.
2. For each slice you pass (`body`, `query`, `params`), runs **`schema.parse(...)`** on **`req.body`**, **`req.query`**, or **`req.params`**.
3. On success, writes the parsed object to **`req.validated.body`** / **`.query`** / **`.params`**.
4. On failure, calls **`next(err)`** with **`ZodError`** → global **`errorHandler`** → HTTP **400** (and issue details).

**Express 5:** **`req.query`** is not reassigned after parse; **`req.validated`** is the supported place for parsed query/params.

---

## `requireValidatedBody` / `requireValidatedQuery` / `requireValidatedParams`

**Readers only** — they **do not** call **`schema.parse`** again.

1. Read the matching property from **`req.validated`**.
2. If missing, throw with a message that tells the developer to add **`validateRequest`** for that slice **before** the handler.

**Typing:** supply **`T`** at the call site, usually **`z.infer<typeof yourSchema>`**:

```ts
const body = requireValidatedBody<z.infer<typeof createItemBodySchema>>(req);
const query = requireValidatedQuery<z.infer<typeof listQuerySchema>>(req);
const params = requireValidatedParams<z.infer<typeof idParamsSchema>>(req);
```

The generic is **TypeScript-only**; it does not perform or affect runtime validation. Use the **same schema** in **`validateRequest`** and in **`z.infer<typeof …>`** so types and runtime stay aligned (there is no runtime schema equality check).

---

## Single source of truth

| Concern            | Where it lives                                                   |
| ------------------ | ---------------------------------------------------------------- |
| Runtime validation | **`validateRequest`** only                                       |
| Parsed values      | **`req.validated.*`**                                            |
| Types              | **`z.infer<typeof schema>`** next to the same schema definitions |

---

## Example flow

**Route**

```ts
router.post("/items", validateRequest({ body: createItemBodySchema }), createItemHandler);
```

**Handler**

```ts
export const createItemHandler: RequestHandler = async (req, res, next) => {
  try {
    const body = requireValidatedBody<z.infer<typeof createItemBodySchema>>(req);
    const result = await createItem(body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};
```

1. Middleware sets **`req.validated.body`** or calls **`next(ZodError)`**.
2. Handler reads typed **`body`** without re-parsing.

---

## Guarantees

- Invalid input for a validated slice does not reach the handler body: failure happens in middleware.
- Misconfigured route (reader without middleware) fails fast with an explicit error.
- No duplicate validation paths.

---

## Files

| File                                         | Purpose                        |
| -------------------------------------------- | ------------------------------ |
| `src/common/middlewares/validate-request.ts` | Middleware + readers           |
| `src/types/express.d.ts`                     | **`Request.validated`** typing |
| `src/common/middlewares/error-handler.ts`    | **`ZodError`** → HTTP response |

See [request-lifecycle.md](./request-lifecycle.md) for where validation sits in the pipeline.
