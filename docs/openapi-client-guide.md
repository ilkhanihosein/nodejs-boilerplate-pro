# OpenAPI → type-safe frontend client

This guide explains how the **backend HTTP API**, **OpenAPI description**, **code generation**, and **frontend contract layer** fit together. No backend route or schema code lives here; this is only how we consume what the server already exposes.

---

## 1. Architecture overview (for a new developer)

| Piece                              | Role in plain language                                                                                                                                                                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend (Express + Zod)**        | Defines real HTTP routes, validates requests, returns JSON. Each route is declared in `*.endpoints.ts` with Zod schemas so runtime behavior and documentation stay aligned.                                                                                                             |
| **OpenAPI document**               | A structured **description** of those routes (paths, methods, bodies, responses, tags). It is produced in memory by `buildOpenApiV1Document()` in `src/api/v1/openapi.ts` — the same source used for Swagger UI at `/docs` when docs are enabled.                                       |
| **Codegen (`openapi-typescript`)** | Reads that description and writes **TypeScript types** that mirror every path and operation. It does not call the network; it only emits types.                                                                                                                                         |
| **Frontend SDK (`frontend/api/`)** | Small TypeScript modules that **import those types** and call `fetch` through **`openapi-fetch`**, so each call is checked against the generated `paths` map. A thin **`createApi()`** wrapper groups methods by OpenAPI **tags** (Auth, Users, Health, API v1) for nicer autocomplete. |

**Single source of truth:** the **running contract** is whatever the server validates and documents — i.e. the Zod-backed endpoint definitions that feed `buildOpenApiV1Document()`. The file `generated/api-types.ts` is a **derived** TypeScript view of that contract; it must be regenerated when routes or schemas change, not edited by hand.

---

## 2. End-to-end pipeline (step by step)

1. **Backend endpoint** — A module (for example `src/modules/auth/auth.endpoints.ts`) registers `POST /login` under the versioned API prefix, with request/response Zod schemas and OpenAPI tags (`Auth`).
2. **OpenAPI** — `buildOpenApiV1Document()` merges all registries into one OpenAPI 3.0.3 JSON-compatible object (paths like `/api/v1/auth/login`, components such as `bearerAuth`).
3. **Generate script** — `npm run openapi:generate` runs `scripts/openapi-generate.ts`, which:
   - imports the same `buildOpenApiV1Document()` the app uses (so the spec is identical to what `/docs` would show);
   - writes `generated/openapi.json` (ignored by git);
   - runs the local `openapi-typescript` CLI to overwrite **`generated/api-types.ts`**.
4. **Types** — `generated/api-types.ts` exports a large `paths` interface: for each URL and HTTP method, TypeScript knows query, path, body, and response shapes.
5. **Client** — `frontend/api/client.ts` creates an `openapi-fetch` client typed with `paths`. Every URL must be a key of `paths`, so typos in paths are compile errors.
6. **Frontend usage** — You call `createApi({ baseUrl, ... })` and then `api.auth.login(...)`, `api.auth.me()`, `api.users.list()`, etc. Arguments and return shapes follow the generated types.

---

## 3. How the frontend uses it (examples)

Import from the contract layer (path may vary depending on where your app code lives):

```ts
import { createApi } from "../frontend/api/index.js";

const api = createApi({
  baseUrl: "http://localhost:3000",
  // Optional: attach a Bearer access token to every request when present
  getAccessToken: () => localStorage.getItem("accessToken") ?? undefined,
});
```

`openapi-fetch` returns a **discriminated** result: either `data` (success body) or `error` (error body), plus `response` for status/headers. Always check which branch you got.

### Login (`POST /api/v1/auth/login`)

```ts
const { data, error, response } = await api.auth.login({
  body: { email: "user@example.com", password: "your-password" },
});

if (data) {
  // `data` matches the OpenAPI 200 response (tokens + user summary)
  console.log(data.accessToken, data.refreshToken);
} else {
  // `error` is typed from non-2xx responses for this operation (e.g. 400, 401)
  console.error(response.status, error);
}
```

### Current user (`GET /api/v1/auth/me`)

Protected routes need a valid access token. With `getAccessToken` set on `createApi`, the client adds `Authorization: Bearer …` automatically.

```ts
const { data, error } = await api.auth.me();

if (data) {
  console.log(data.user.email, data.user.role);
} else {
  console.error(error);
}
```

### Users list (admin, `GET /api/v1/users`)

```ts
const { data, error, response } = await api.users.list();

if (data) {
  console.log(data.items);
} else if (response.status === 403) {
  // Not an admin — typed error branch
  console.error("Forbidden", error);
}
```

### Low-level access (any generated path)

If a route does not yet have a domain alias, use the typed client on `createApi`:

```ts
const { data, error } = await api.client.GET("/api/v1/hello", {
  params: { query: { name: "Ada" } },
});
```

---

## 4. Manual vs automatic

### Automatic (generated or tooling)

| Output / behavior                               | How                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| **`generated/api-types.ts`**                    | Overwritten by `openapi-typescript` when you run `openapi:generate`. **Do not edit.** |
| **`generated/openapi.json`**                    | Written each run; gitignored (intermediate file for the CLI).                         |
| **Type checking of `frontend/` + `generated/`** | `npm run typecheck:frontend` (also part of `npm run check`).                          |

### Manual (developer actions)

| Action                                | When                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`npm run openapi:generate`**        | After you change routes, request bodies, responses, or `API_V1_PREFIX` in a way that changes URLs — so TypeScript stays in sync with the server.                                                                                                                                                                                   |
| **Commit `generated/api-types.ts`**   | Typical workflow: regenerate and commit the updated types so CI and teammates see the same contract.                                                                                                                                                                                                                               |
| **Keep domain path literals aligned** | `frontend/api/index.ts` uses fixed path strings such as `"/api/v1/auth/login"`. They must remain valid **`keyof paths`** after regeneration. Default prefix is `/api/v1`; if you use a custom `API_V1_PREFIX`, regenerate and **update those literals** (or use `api.client` only with the new path keys from the generated file). |
| **Env for the generate script**       | `openapi:generate` sets minimal `MONGODB_URI` and JWT secrets via `cross-env` so `src/config/env.ts` can load; your `.env` still applies for values like `API_V1_PREFIX` when present.                                                                                                                                             |

---

## 5. Developer workflow (day to day)

1. Change backend endpoints/schemas as usual (still the source of truth).
2. Run **`npm run openapi:generate`**.
3. Review the diff in **`generated/api-types.ts`**.
4. If you added a new operation, either:
   - call **`api.client.METHOD(path, init)`** with a path from `paths`, or
   - add a small alias under **`createApi()`** in `frontend/api/index.ts` (optional ergonomic layer).
5. Run **`npm run check`** before pushing (format, lint, tests, frontend typecheck, backend `tsc`).

**Relevant files**

| Path                          | Purpose                                                |
| ----------------------------- | ------------------------------------------------------ |
| `src/api/v1/openapi.ts`       | Builds the OpenAPI document (server + codegen input).  |
| `scripts/openapi-generate.ts` | Writes JSON + runs `openapi-typescript`.               |
| `generated/api-types.ts`      | Generated `paths` + component types.                   |
| `frontend/api/client.ts`      | `createOpenApiClient` → typed `openapi-fetch`.         |
| `frontend/api/index.ts`       | `createApi` — tag-shaped `api.auth`, `api.users`, etc. |
| `tsconfig.frontend.json`      | Typecheck scope for contract + generated types.        |

---

## 6. Relationship to other docs

- **[openapi.md](./openapi.md)** — How OpenAPI is produced **on the server** from Zod and registries (no frontend).
- **[authentication-and-authorization.md](./authentication-and-authorization.md)** — JWT and roles; complements the `api.auth.*` examples above.

---

## 7. Troubleshooting (quick)

| Symptom                                  | Likely cause                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| TypeScript says path is not in `paths`   | Regenerate (`openapi:generate`) or fix `API_V1_PREFIX` / path literals in `frontend/api/index.ts`. |
| `npm run openapi:generate` throws on env | Ensure the script’s env or your `.env` satisfies `env.ts` (Mongo + JWT secrets at minimum).        |
| Runtime 404 with “right” code            | `baseUrl` wrong, or path prefix differs from generated `paths` (regenerate with correct env).      |

This document is the onboarding entry point for the **OpenAPI-driven frontend contract**; server OpenAPI internals remain documented in `openapi.md`.
