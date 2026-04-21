import {
  defineProtectedEndpoint,
  definePublicEndpoint,
} from "../../common/http/define-endpoint.js";
import { HttpEndpointRegistry } from "../../common/http/http-endpoint-registry.js";
import {
  appErrorResponseSchema,
  validationErrorResponseSchema,
} from "../../common/http/http-error-response.schemas.js";
import { apiV1BasePath } from "../../api/v1/api-path.js";
import {
  authLogoutOkResponseSchema,
  authMeResponseSchema,
  authTokenPairResponseSchema,
  loginBodySchema,
  logoutRefreshTokenBodySchema,
  refreshBodySchema,
  registerBodySchema,
} from "./auth.schemas.js";
import {
  buildAuthMeResponse,
  buildLogoutOkResponse,
  loginUser,
  logoutSession,
  refreshSessionTokens,
  registerUser,
} from "./auth.service.js";

const registerEndpoint = definePublicEndpoint({
  method: "post",
  path: "/register",
  tags: ["Auth"],
  summary: "Register",
  request: { body: registerBodySchema },
  responses: {
    201: {
      description: "User created; tokens issued",
      schema: authTokenPairResponseSchema,
    },
    400: {
      description: "Validation error",
      schema: validationErrorResponseSchema,
    },
    409: {
      description: "Email already exists",
      schema: appErrorResponseSchema,
    },
  },
  handler: async ({ validated, json }) => {
    json(201, await registerUser(validated.body));
  },
});

const loginEndpoint = definePublicEndpoint({
  method: "post",
  path: "/login",
  tags: ["Auth"],
  summary: "Login",
  request: { body: loginBodySchema },
  responses: {
    200: {
      description: "Tokens issued",
      schema: authTokenPairResponseSchema,
    },
    400: { description: "Validation error", schema: validationErrorResponseSchema },
    401: { description: "Invalid credentials", schema: appErrorResponseSchema },
  },
  handler: async ({ validated, json }) => {
    json(200, await loginUser(validated.body));
  },
});

const refreshEndpoint = definePublicEndpoint({
  method: "post",
  path: "/refresh",
  tags: ["Auth"],
  summary: "Refresh access token",
  request: { body: refreshBodySchema },
  responses: {
    200: {
      description: "New tokens",
      schema: authTokenPairResponseSchema,
    },
    400: { description: "Validation error", schema: validationErrorResponseSchema },
    401: { description: "Invalid or reused refresh token", schema: appErrorResponseSchema },
  },
  handler: async ({ validated, json }) => {
    json(200, await refreshSessionTokens(validated.body));
  },
});

/**
 * Public logout: revokes the **refresh-token session** only.
 *
 * - Body is `logoutRefreshTokenBodySchema` (refresh JWT string), validated like refresh.
 * - Does **not** use the `Authorization` access bearer or `req.authUser` (no `defineProtectedEndpoint`).
 * - If product requirements ever need “logout via access token”, switch this route to
 *   `defineProtectedEndpoint` and drive revocation from `req.authUser` instead.
 */
const logoutEndpoint = definePublicEndpoint({
  method: "post",
  path: "/logout",
  tags: ["Auth"],
  summary: "Logout (revoke refresh session)",
  request: { body: logoutRefreshTokenBodySchema },
  responses: {
    200: {
      description: "Logged out",
      schema: authLogoutOkResponseSchema,
    },
    400: { description: "Validation error", schema: validationErrorResponseSchema },
  },
  handler: async ({ validated, json }) => {
    await logoutSession(validated.body);
    json(200, buildLogoutOkResponse());
  },
});

const meEndpoint = defineProtectedEndpoint({
  method: "get",
  path: "/me",
  tags: ["Auth"],
  summary: "Current user",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Profile", schema: authMeResponseSchema },
    401: { description: "Missing or invalid access token", schema: appErrorResponseSchema },
  },
  handler: ({ req, json }) => {
    json(200, buildAuthMeResponse(req.authUser));
  },
});

const authEndpointRegistry = new HttpEndpointRegistry(`${apiV1BasePath()}/auth`);
authEndpointRegistry.add(registerEndpoint);
authEndpointRegistry.add(loginEndpoint);
authEndpointRegistry.add(refreshEndpoint);
authEndpointRegistry.add(logoutEndpoint);
authEndpointRegistry.add(meEndpoint);
export { authEndpointRegistry };
