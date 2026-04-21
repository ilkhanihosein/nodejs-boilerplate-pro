import { describe, expect, it } from "vitest";
import { buildOpenApiV1Document } from "../src/api/v1/openapi.js";
import { env } from "../src/config/env.js";

/**
 * Smoke-check that the generated OpenAPI document still exposes the core routes
 * wired through HttpEndpointRegistry + define*Endpoint (catches drift vs handlers).
 */
describe("OpenAPI contract smoke", () => {
  it("includes health, v1 public, auth, and users paths", () => {
    const doc = buildOpenApiV1Document() as { paths: Record<string, Record<string, unknown>> };
    const paths = Object.keys(doc.paths);

    expect(paths).toContain("/health");
    expect(paths).toContain("/health/ready");

    const prefix = env.apiV1Prefix;
    expect(paths).toContain(`${prefix}`);
    expect(paths).toContain(`${prefix}/hello`);
    expect(paths).toContain(`${prefix}/auth/register`);
    expect(paths).toContain(`${prefix}/auth/login`);
    expect(paths).toContain(`${prefix}/auth/refresh`);
    expect(paths).toContain(`${prefix}/auth/logout`);
    expect(paths).toContain(`${prefix}/auth/me`);
    expect(paths).toContain(`${prefix}/users`);
    expect(paths).toContain(`${prefix}/users/{id}`);
    expect(paths).toContain(`${prefix}/users/{id}/role`);
  });

  it("lists GET on /users with pagination query parameters", () => {
    const doc = buildOpenApiV1Document() as {
      paths: Record<string, { get?: { parameters?: unknown[] } }>;
    };
    const getUsers = doc.paths[`${env.apiV1Prefix}/users`]?.get;
    expect(getUsers, "GET /users must be registered").toBeDefined();
    const params = getUsers?.parameters;
    expect(Array.isArray(params)).toBe(true);
    const names = (params as { name: string; in: string }[])
      .filter((p) => p.in === "query")
      .map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["page", "limit", "sort"]));
  });
});
