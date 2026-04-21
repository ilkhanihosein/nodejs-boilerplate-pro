# OpenAPI (Zod-generated)

The document at **`/docs`** (when **`API_DOCS_ENABLED`**) is built by **`buildOpenApiV1Document()`** in **`src/api/v1/openapi.ts`** using [**@asteasolutions/zod-to-openapi**](https://github.com/asteasolutions/zod-to-openapi).

## Flow

| Layer                              | Role                                                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`*.schemas.ts`**                 | Zod request/response shapes — validation, OpenAPI, and **`z.infer`** types for TypeScript                                                                      |
| **`*.endpoints.ts`**               | **`definePublicEndpoint`** / **`defineProtectedEndpoint`**: wire HTTP, **`validateRequest`**, handler calls **`json(status, data)`**                           |
| **`json()`**                       | **Only** runtime parse for **response** bodies (`responses[status].schema.parse` then send). Return type **`never`**: success path ends there (no code after). |
| **`validateRequest`**              | **Only** runtime parse for **request** slices used on that route                                                                                               |
| **`buildValidatedBagFromRequest`** | Copies **`req.validated`** into the handler (no second parse)                                                                                                  |
| **`*.service.ts`**                 | Business logic; returns objects typed with **`import type { … }`** from schemas — **no Zod**, no Express (see ESLint)                                          |
| **`HttpEndpointRegistry`**         | **`add`**, **`mount`**, **`contributeOpenApi`**; protected routes must lead with **`requireAuth`**                                                             |

**`openapi.ts`**: components (e.g. **`bearerAuth`**) + **`contributeOpenApi`** on each registry — no hand-written **`registerPath`**.

**Logout:** public **`POST /auth/logout`**; body **`logoutRefreshTokenBodySchema`** (refresh JWT only). See **`auth.endpoints.ts`**.

## Files

- **`*.routes.ts`** — **`registry.mount(router)`** only
- **`users.mapper.ts`** — maps **`UserLeanPublic`** (`user.model.ts`, Mongoose **`lean()`** without `passwordHash`) into **`UserListItem`** / list wrappers; services stay cast-free

## Bootstrap

**`extendZodWithOpenApi`** — **`src/config/zod-openapi-init.ts`** (imported from **`src/app.ts`** and test setup).

## Related

- [env-configuration.md](./env-configuration.md)
- [validation.md](./validation.md)
