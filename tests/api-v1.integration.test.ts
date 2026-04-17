import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";

describe("API v1", () => {
  it("GET /api/v1 returns boilerplate JSON", async () => {
    const app = createApp();
    const res = await request(app).get(`${env.apiV1Prefix}/`).expect(200);
    expect(res.body).toMatchObject({ ok: true, api: env.apiV1Prefix });
  });

  it("GET /api/v1/hello validates query with Zod", async () => {
    const app = createApp();
    const ok = await request(app)
      .get(`${env.apiV1Prefix}/hello`)
      .query({ name: "Ada" })
      .expect(200);
    expect(ok.body).toEqual({ message: "Hello, Ada" });

    const bad = await request(app).get(`${env.apiV1Prefix}/hello`).expect(400);
    expect(bad.body.code).toBe("validation_error");
  });
});
