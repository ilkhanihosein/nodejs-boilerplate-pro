import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "../src/modules/auth/auth.service.js";

describe("auth token service", () => {
  it("signs and verifies an access token", () => {
    const token = signAccessToken({
      sub: "507f1f77bcf86cd799439011",
      email: "admin@example.com",
      role: "admin",
    });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("507f1f77bcf86cd799439011");
    expect(payload.email).toBe("admin@example.com");
    expect(payload.role).toBe("admin");
    expect(payload.type).toBe("access");
  });

  it("rejects malformed tokens", () => {
    expect(() => verifyAccessToken("not-a-token")).toThrowError();
  });
});
