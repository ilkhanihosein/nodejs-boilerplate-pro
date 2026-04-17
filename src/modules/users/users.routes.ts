import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middlewares/auth.js";
import { validateRequest } from "../../common/middlewares/validate-request.js";
import { getUserByIdHandler, listUsersHandler, updateUserRoleHandler } from "./users.controller.js";
import { updateRoleBodySchema, userIdParamsSchema } from "./users.schemas.js";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole("admin"));
usersRouter.get("/", listUsersHandler);
usersRouter.get("/:id", validateRequest({ params: userIdParamsSchema }), getUserByIdHandler);
usersRouter.patch(
  "/:id/role",
  validateRequest({ params: userIdParamsSchema, body: updateRoleBodySchema }),
  updateUserRoleHandler,
);
