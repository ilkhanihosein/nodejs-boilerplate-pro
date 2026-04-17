import { describe, expect, it, vi } from "vitest";
import { requireRole } from "../src/common/middlewares/auth.js";

describe("role-based access middleware", () => {
  it("denies when role is not allowed", () => {
    const middleware = requireRole("admin");
    const next = vi.fn();
    const req = { authUser: { id: "u1", email: "u@example.com", role: "customer" } };

    middleware(req as never, {} as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0]?.[0] as { statusCode?: number; code?: string } | undefined;
    expect(err?.statusCode).toBe(403);
    expect(err?.code).toBe("forbidden");
  });
});
