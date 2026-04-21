# Checklist: new HTTP **list** endpoints

Use this for any **`GET`** that returns a **collection** (users, orders, etc.). Keeps query contracts, OpenAPI, and DB mapping consistent across modules.

## Must do

1. **Query schema (Zod)**
   - **Pagination:** use **`offsetPaginationQuerySchema`** from [`src/common/http/offset-pagination.ts`](../src/common/http/offset-pagination.ts) _or_ **`cursorPaginationQuerySchema`** for cursor-style lists—not ad-hoc `page` / `limit` fields.
   - **Sort:** use **`sortQuerySchema(ALLOWED_FIELDS)`** from [`src/common/http/sort-query.ts`](../src/common/http/sort-query.ts) with a **readonly tuple** of whitelisted field names (same list you pass to **`mongoSortFromSortQuery`**).
   - **Compose** both fragments on one object schema, e.g.  
     `offsetPaginationQuerySchema.extend(sortQuerySchema(MY_SORT_FIELDS).shape)`  
     (or the cursor schema **+** sort the same way.)

2. **Wire the route**
   - Pass the composed schema in **`definePublicEndpoint` / `defineProtectedEndpoint`** as **`request: { query: … }`** (or add **`validateRequest`** if the route is not fully migrated to `define*` yet).
   - In the service, call **`resolveOffsetPagination`** (or your cursor resolver) and **`mongoSortFromSortQuery`** with the **same** allowed-field tuple and documented default sort.

3. **OpenAPI**
   - List routes must be registered only via **`HttpEndpointRegistry`** + **`contributeOpenApi`** (no hand-written paths).
   - After changing paths or schemas, run **`npm run openapi:generate`** and commit **`generated/openapi.json`**; CI runs **`npm run openapi:check`**.

4. **Response schema**
   - Declare every success and error status you return through **`json()`** or **`AppError`** (e.g. **401** when a dependency verifies a token).
   - Reuse **`validationErrorResponseSchema`** / **`appErrorResponseSchema`** where responses match the global **`errorHandler`**.

## Reference implementation

- [`src/modules/users/users.schemas.ts`](../src/modules/users/users.schemas.ts) — **`offsetPaginationQuerySchema.extend(sortQuerySchema(...).shape)`** for `GET /users`.
- [`src/modules/users/users.endpoints.ts`](../src/modules/users/users.endpoints.ts) — `request.query` + responses.
- [`src/modules/users/users.service.ts`](../src/modules/users/users.service.ts) — **`mongoSortFromSortQuery`** + **`find().sort()`**.

When you add **offset** (or cursor) to an existing sort-only list, extend the query schema and service in the same PR so clients and docs stay aligned.
