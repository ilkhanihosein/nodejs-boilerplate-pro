import type { Request } from "express";

/** UUID v1–v5 path segment (RFC variant nibble). */
const UUID_PATH_SEGMENT =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi;

function stripQueryString(path: string): string {
  const q = path.indexOf("?");
  return q === -1 ? path : path.slice(0, q);
}

function readRoutePathString(req: Request): string | undefined {
  const raw: unknown = Reflect.get(req as object, "route");
  if (raw === undefined || raw === null || typeof raw !== "object") {
    return undefined;
  }
  const p: unknown = Reflect.get(raw, "path");
  return typeof p === "string" && p.length > 0 ? p : undefined;
}

/**
 * UUID → `/:id`, Mongo ObjectId → `/:id`, strictly numeric segments with **>6** digits → `/:id`.
 * Short numeric segments (e.g. `/2024`) are left as-is.
 */
function normalizePathSegments(pathname: string): string {
  let out = pathname.replace(UUID_PATH_SEGMENT, "/:id");
  out = out.replace(/\/[0-9a-f]{24}(?=\/|$)/gi, "/:id");
  out = out.replace(/\/\d{7,}(?=\/|$)/g, "/:id");
  return out;
}

function finalizeRouteLabel(rawLabel: string): string {
  const normalized = normalizePathSegments(rawLabel);
  return normalized.length === 0 ? "unmatched" : normalized;
}

/**
 * Single source of truth for HTTP `route` labels and OpenTelemetry **`http.route`**.
 *
 * - If **`req.route.path`** is a non-empty string → **`baseUrl` + that path** (query stripped from the segment if present).
 * - Else → **`baseUrl` + `req.path`** (query stripped).
 * - Dynamic segments normalized as above; empty result → **`unmatched`**.
 */
export function resolveHttpRoute(req: Request): string {
  const base = req.baseUrl;
  const routePath = readRoutePathString(req);
  const tail = routePath !== undefined ? stripQueryString(routePath) : stripQueryString(req.path);
  const combined = `${base}${tail}`;
  if (combined.length === 0) {
    return "unmatched";
  }
  return finalizeRouteLabel(combined);
}

/** @alias {@link resolveHttpRoute} */
export function httpMetricsRouteLabel(req: Request): string {
  return resolveHttpRoute(req);
}

/**
 * Normalized URL path (no query) for **`http.target`** — same segment rules as **`resolveHttpRoute`**
 * but always derived from the request path shape (**`baseUrl` + `req.path`**), not the matched route pattern.
 */
export function httpMetricsNormalizedTarget(req: Request): string {
  const combined = stripQueryString(`${req.baseUrl}${req.path}`);
  if (combined.length === 0) {
    return "unmatched";
  }
  return finalizeRouteLabel(combined);
}
