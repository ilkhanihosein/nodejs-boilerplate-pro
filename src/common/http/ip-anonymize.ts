import { isIPv4, isIPv6 } from "node:net";

const IPV6_TELEMETRY_MAX = 32;

/**
 * Masks IPv4 last octet (`192.168.1.0`) and truncates IPv6 for lower cardinality / privacy.
 */
export function anonymizeIpForTelemetry(ip: string): string {
  const t = ip.trim();
  if (t.length === 0) {
    return t;
  }
  if (isIPv4(t)) {
    const lastDot = t.lastIndexOf(".");
    return lastDot > 0 ? `${t.slice(0, lastDot + 1)}0` : t;
  }
  if (isIPv6(t)) {
    return t.length > IPV6_TELEMETRY_MAX ? `${t.slice(0, IPV6_TELEMETRY_MAX)}...` : t;
  }
  if (t.includes(":") && !t.includes(".")) {
    return t.length > IPV6_TELEMETRY_MAX ? `${t.slice(0, IPV6_TELEMETRY_MAX)}...` : t;
  }
  return t.length > 64 ? `${t.slice(0, 64)}...` : t;
}
