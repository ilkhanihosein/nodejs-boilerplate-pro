# Testing

Integration and unit tests use **Vitest**. HTTP-level tests use **supertest** against **`createApp()`** from **`src/app.ts`**.

---

## Layout

| Path                                  | Role                                                              |
| ------------------------------------- | ----------------------------------------------------------------- |
| `tests/*.integration.test.ts`         | HTTP + app wiring (supertest); may use **mongodb-memory-server**  |
| `tests/*.unit.test.ts`                | Pure units (optional naming convention)                           |
| `tests/openapi.contract.unit.test.ts` | OpenAPI smoke: **`buildOpenApiV1Document()`** paths vs registries |

`vitest.config.ts` sets **`include: ["tests/**/\*.test.ts"]`\*\*.

---

## Coverage

**`npm run test:ci`** runs **`vitest run --coverage`** (V8 provider). Global thresholds live in **`vitest.config.ts`** under **`test.coverage.thresholds`** (currently modest floors so CI stays green on the sample suite); raise them and widen tests as the project grows. Adjust **`coverage.include`** / **`exclude`** if paths such as **`server.ts`** or observability glue should not count toward the same bar.

---

## Environment during tests

**`vitest.config.ts`** injects **`env`** for the test process so **`src/config/env.ts`** can import without a local **`.env`**:

- **`JWT_ACCESS_SECRET`**, **`JWT_REFRESH_SECRET`**, **`MONGODB_URI`** are set to **placeholder** values.

Those placeholders are **only** for Vitest; do not use them in real deployments.

If you add **required** env keys to **`env.ts`**, update **`vitest.config.ts`** under **`test.env`** so CI and local **`npm test`** keep working.

---

## Integration tests

Typical pattern:

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("GET /health", () => {
  it("returns 200", async () => {
    const app = createApp();
    await request(app).get("/health").expect(200);
  });
});
```

**MongoDB:** `createApp()` does **not** connect to Mongo by itself. Many tests run against the app **without** a live database; endpoints that require Mongo may need **mongodb-memory-server** or a test container if you assert DB-backed behavior.

---

## Commands

| Command           | Purpose                               |
| ----------------- | ------------------------------------- |
| `npm test`        | Vitest watch                          |
| `npm run test:ci` | Single run (CI)                       |
| `npm run check`   | format + lint + **`test:ci`** + build |

---

## Related

- [architecture.md](./architecture.md) — CI runs `check`
- [troubleshooting.md](./troubleshooting.md) — test env issues
