import { describe, expect, it } from "vitest";
import { telemetryUserAgentSummary } from "../src/common/http/user-agent-summary.js";

describe("telemetryUserAgentSummary", () => {
  it("returns other for empty", () => {
    expect(telemetryUserAgentSummary(undefined)).toBe("other");
    expect(telemetryUserAgentSummary("")).toBe("other");
    expect(telemetryUserAgentSummary("   ")).toBe("other");
  });

  it("detects major browsers", () => {
    expect(
      telemetryUserAgentSummary(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe("chrome/120");
    expect(
      telemetryUserAgentSummary(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
      ),
    ).toBe("safari/17");
    expect(
      telemetryUserAgentSummary(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      ),
    ).toBe("firefox/121");
    expect(
      telemetryUserAgentSummary(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      ),
    ).toBe("edge/120");
  });
});
