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
