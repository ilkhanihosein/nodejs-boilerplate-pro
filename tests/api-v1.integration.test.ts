import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";

describe("API v1", () => {
  it("GET /api/v1 returns boilerplate JSON", async () => {
    const app = createApp();
    const res = await request(app).get(`${env.apiV1Prefix}/`).expect(200);
    expect(res.body).toMatchObject({
      ok: true,
      api: env.apiV1Prefix,
      apiVersion: env.apiVersion,
    });
    expect(res.headers["x-api-version"]).toBe(env.apiVersion);
  });

  it("GET /api/v1/hello validates query with Zod", async () => {
    const app = createApp();
    const ok = await request(app)
      .get(`${env.apiV1Prefix}/hello`)
      .query({ name: "Ada" })
      .expect(200);
    expect(ok.body).toMatchObject({
      message: "Hello, Ada",
      apiVersion: env.apiVersion,
    });
    expect(ok.headers["x-api-version"]).toBe(env.apiVersion);

    const bad = await request(app).get(`${env.apiV1Prefix}/hello`).expect(400);
    expect(bad.body).toMatchObject({
      code: "validation_error",
      apiVersion: env.apiVersion,
    });
  });

  it("GET /docs serves Swagger UI when API docs are enabled", async () => {
    const app = createApp();
    const res = await request(app).get("/docs/").expect(200);
    expect(res.text).toContain("swagger-ui");
  });
});
