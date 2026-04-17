import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("GET /health", () => {
  it("returns 200 and payload", async () => {
    const app = createApp();
    const res = await request(app).get("/health").expect(200);
    expect(res.body).toMatchObject({ status: "ok", service: "e-commerce-api" });
  });
});

describe("GET /health/ready", () => {
  it("returns 503 when Mongo is not connected (e.g. tests use createApp without connect)", async () => {
    const app = createApp();
    const res = await request(app).get("/health/ready").expect(503);
    expect(res.body).toMatchObject({
      status: "not_ready",
      service: "e-commerce-api",
      mongo: { state: "disconnected", readyState: 0 },
    });
  });
});
