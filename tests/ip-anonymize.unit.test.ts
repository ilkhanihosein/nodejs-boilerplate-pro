import { describe, expect, it } from "vitest";
import { anonymizeIpForTelemetry } from "../src/common/http/ip-anonymize.js";

describe("anonymizeIpForTelemetry", () => {
  it("masks IPv4 last octet", () => {
    expect(anonymizeIpForTelemetry("192.168.1.42")).toBe("192.168.1.0");
    expect(anonymizeIpForTelemetry("10.0.0.1")).toBe("10.0.0.0");
  });

  it("truncates long IPv6", () => {
    const long = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
    const out = anonymizeIpForTelemetry(long);
    expect(out.endsWith("...")).toBe(true);
    expect(out.length).toBe(35);
  });
});
