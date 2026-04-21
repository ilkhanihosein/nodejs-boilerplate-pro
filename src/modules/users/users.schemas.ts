import { z } from "zod";
import { sortQuerySchema } from "../../common/http/sort-query.js";
import { USER_ROLES } from "./user.model.js";

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const updateRoleBodySchema = z.object({
  role: z.enum(USER_ROLES),
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type UpdateRoleBody = z.infer<typeof updateRoleBodySchema>;

/** Allowed `sort` fields for `GET /users` (same tuple passed to `mongoSortFromSortQuery` in `listUsers`). */
export const USER_LIST_SORT_FIELDS = ["createdAt", "updatedAt", "email", "name", "role"] as const;

export const usersListQuerySchema = sortQuerySchema(USER_LIST_SORT_FIELDS);

export type UsersListQuery = z.infer<typeof usersListQuerySchema>;

/** Lean user document from Mongo (no `passwordHash`). */
export const userListItemResponseSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
  })
  .loose();

export const usersListResponseSchema = z.object({
  items: z.array(userListItemResponseSchema),
});

export const userItemResponseSchema = z.object({
  item: userListItemResponseSchema,
});

export type UserListItem = z.infer<typeof userListItemResponseSchema>;
export type UsersListResponse = z.infer<typeof usersListResponseSchema>;
export type UserItemResponse = z.infer<typeof userItemResponseSchema>;
