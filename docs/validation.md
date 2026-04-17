# Request validation (Zod)

Validation is intentionally **split**: **one** place runs **Zod** (`parse`), and controllers **read** trusted values from **`req.validated`** with **TypeScript** types derived from the same schemas—without re-parsing and without ad-hoc `as` casts at the call site.

---

## `validateRequest` middleware

**Location:** `src/common/middlewares/validate-request.ts`

**Usage on routes:**

```ts
router.post("/path", validateRequest({ body: myBodySchema }), handler);
// and/or: query: myQuerySchema, params: myParamsSchema
```

**Behavior:**

1. Ensures `req.validated` exists (object for body/query/params slices).
2. For each part you pass (`body`, `query`, `params`), runs **`schema.parse(...)`** against the raw Express input (`req.body`, `req.query`, `req.params`).
3. On success, assigns the **parsed output** to `req.validated.body` / `.query` / `.params` (separate keys per slice).
4. On failure, calls **`next(err)`** with the **`ZodError`** (handled by the global error handler → HTTP 400 + issue details).

**Why not write back to `req.query` / `req.params`?**  
In **Express 5**, `req.query` is treated as **read-only** for assignment. Parsed values therefore live on **`req.validated`**, which is the stable contract for “validated HTTP input.”

---

## `requireValidatedBody` / `requireValidatedQuery` / `requireValidatedParams`

**Role:** **Readers only**. They do **not** call `schema.parse` again.

Each function:

1. Reads the corresponding slice from **`req.validated`**.
2. If the slice is missing, throws a **clear runtime error** instructing the developer to add `validateRequest` for that slice **before** the controller.

**Typing pattern:** pass an explicit generic at the call site, equal to **`z.infer<typeof yourSchema>`**:

```ts
const body = requireValidatedBody<z.infer<typeof registerBodySchema>>(req);
const { name } = requireValidatedQuery<z.infer<typeof helloQuerySchema>>(req);
const params = requireValidatedParams<z.infer<typeof userIdParamsSchema>>(req);
```

The implementation returns `T` using an **internal** cast from `unknown` stored on `req.validated`. Controllers avoid writing **`as SomeType`** on the result: the **generic** carries the type from the **same Zod schema** you used in `validateRequest`.

**Convention:** Use the **same schema module** for both `validateRequest({ … })` and the **`z.infer<typeof …>`** in the controller. There is no runtime “schema equality” check—discipline keeps a single source of truth.

---

## Single source of truth

| Concern            | Source of truth                                         |
| ------------------ | ------------------------------------------------------- |
| Runtime validation | **`validateRequest`** only (`parse`)                    |
| Parsed values      | **`req.validated.*`**                                   |
| TypeScript types   | **`z.infer<typeof schema>`** aligned with those schemas |

If `validateRequest` is omitted for a slice, the reader throws—there is **no** silent fallback re-validation in the controller.

---

## Example: route + controller

**Route** (`*.routes.ts`):

```ts
router.post("/register", validateRequest({ body: registerBodySchema }), registerHandler);
```

**Controller:**

```ts
export const registerHandler: RequestHandler = async (req, res, next) => {
  try {
    const body = requireValidatedBody<z.infer<typeof registerBodySchema>>(req);
    const result = await registerUser(body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};
```

Flow:

1. `validateRequest` runs → `req.validated.body` is set or `next(ZodError)`.
2. Controller runs → `requireValidatedBody<…>(req)` returns typed `body`.
3. Service receives a plain object typed from Zod.

---

## Runtime safety guarantees

- **Invalid input** never reaches the controller for the validated slice: Zod fails in middleware.
- **Missing middleware** for a slice: **throws** in the reader with an actionable message (fail fast during development or misconfiguration).
- **No double validation**: avoids extra CPU and avoids two sources of truth diverging.

---

## Related files

| File                                         | Purpose                    |
| -------------------------------------------- | -------------------------- |
| `src/common/middlewares/validate-request.ts` | Middleware + readers       |
| `src/types/express.d.ts`                     | `Request.validated` typing |
| `src/common/middlewares/error-handler.ts`    | `ZodError` → HTTP 400      |

See also: [request-lifecycle.md](./request-lifecycle.md).
