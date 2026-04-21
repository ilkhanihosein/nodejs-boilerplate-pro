import { env } from "../../config/env.js";

/** OpenAPI + routing base for the versioned API (no trailing slash). */
export function apiV1BasePath(): string {
  const raw = env.apiV1Prefix;
  if (raw.length > 1 && raw.endsWith("/")) {
    return raw.slice(0, -1);
  }
  return raw;
}
