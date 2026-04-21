import { z } from "zod";
import { USER_ROLES } from "./user.model.js";

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const updateRoleBodySchema = z.object({
  role: z.enum(USER_ROLES),
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type UpdateRoleBody = z.infer<typeof updateRoleBodySchema>;

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
