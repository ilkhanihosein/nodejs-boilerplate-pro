import type { HttpEndpointRegistry } from "../../common/http/http-endpoint-registry.js";
import { authEndpointRegistry } from "../../modules/auth/auth.endpoints.js";
import { healthEndpointRegistry } from "../../modules/health/health.endpoints.js";
import { usersEndpointRegistry } from "../../modules/users/users.endpoints.js";
import { v1PublicEndpointRegistry } from "./v1-public.endpoints.js";

/**
 * Registries whose endpoints are both mounted on Express and contributed to the v1 OpenAPI document.
 * When adding a versioned surface, append here and mount the same registry on the router — CI
 * enforces registry ↔ OpenAPI equality and response/request JSON schemas.
 */
export const httpContractRegistries: readonly HttpEndpointRegistry[] = [
  healthEndpointRegistry,
  v1PublicEndpointRegistry,
  authEndpointRegistry,
  usersEndpointRegistry,
];
