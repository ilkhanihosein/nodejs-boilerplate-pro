import { defineProtectedEndpoint } from "../../common/http/define-endpoint.js";
import { HttpEndpointRegistry } from "../../common/http/http-endpoint-registry.js";
import {
  appErrorResponseSchema,
  validationErrorResponseSchema,
} from "../../common/http/http-error-response.schemas.js";
import { requireRole } from "../../common/middlewares/auth.js";
import { apiV1BasePath } from "../../api/v1/api-path.js";
import {
  updateRoleBodySchema,
  userIdParamsSchema,
  userItemResponseSchema,
  usersListResponseSchema,
} from "./users.schemas.js";
import { getUserById, listUsers, updateUserRole } from "./users.service.js";

const listUsersEndpoint = defineProtectedEndpoint({
  method: "get",
  path: "/",
  tags: ["Users"],
  summary: "List users (admin)",
  security: [{ bearerAuth: [] }],
  middlewares: [requireRole("admin")],
  responses: {
    200: {
      description: "User list",
      schema: usersListResponseSchema,
    },
    401: { description: "Unauthorized", schema: appErrorResponseSchema },
    403: { description: "Forbidden (not admin)", schema: appErrorResponseSchema },
  },
  handler: async ({ json }) => {
    json(200, await listUsers());
  },
});

const getUserByIdEndpoint = defineProtectedEndpoint({
  method: "get",
  path: "/:id",
  tags: ["Users"],
  summary: "Get user by id (admin)",
  security: [{ bearerAuth: [] }],
  middlewares: [requireRole("admin")],
  request: { params: userIdParamsSchema },
  responses: {
    200: { description: "User", schema: userItemResponseSchema },
    400: { description: "Validation error", schema: validationErrorResponseSchema },
    401: { description: "Unauthorized", schema: appErrorResponseSchema },
    403: { description: "Forbidden", schema: appErrorResponseSchema },
    404: { description: "Not found", schema: appErrorResponseSchema },
  },
  handler: async ({ validated, json }) => {
    json(200, await getUserById(validated.params));
  },
});

const updateUserRoleEndpoint = defineProtectedEndpoint({
  method: "patch",
  path: "/:id/role",
  tags: ["Users"],
  summary: "Update user role (admin)",
  security: [{ bearerAuth: [] }],
  middlewares: [requireRole("admin")],
  request: { params: userIdParamsSchema, body: updateRoleBodySchema },
  responses: {
    200: { description: "Updated user", schema: userItemResponseSchema },
    400: { description: "Validation error", schema: validationErrorResponseSchema },
    401: { description: "Unauthorized", schema: appErrorResponseSchema },
    403: { description: "Forbidden", schema: appErrorResponseSchema },
    404: { description: "Not found", schema: appErrorResponseSchema },
  },
  handler: async ({ validated, json }) => {
    json(200, await updateUserRole(validated.params, validated.body));
  },
});

const usersEndpointRegistry = new HttpEndpointRegistry(`${apiV1BasePath()}/users`);
usersEndpointRegistry.add(listUsersEndpoint);
usersEndpointRegistry.add(getUserByIdEndpoint);
usersEndpointRegistry.add(updateUserRoleEndpoint);
export { usersEndpointRegistry };
