import type { RequestHandler } from "express";
import type { z } from "zod";
import { AppError } from "../../common/errors/app-error.js";
import { getLogger } from "../../common/logger.js";
import {
  requireValidatedBody,
  requireValidatedParams,
} from "../../common/middlewares/validate-request.js";
import { UserModel } from "./user.model.js";
import { updateRoleBodySchema, userIdParamsSchema } from "./users.schemas.js";

export const listUsersHandler: RequestHandler = async (_req, res, next) => {
  try {
    getLogger().debug({ event: "list_users" }, "list_users");
    const users = await UserModel.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ items: users });
  } catch (err) {
    next(err);
  }
};

export const getUserByIdHandler: RequestHandler = async (req, res, next) => {
  try {
    const params = requireValidatedParams<z.infer<typeof userIdParamsSchema>>(req);
    const user = await UserModel.findById(params.id, { passwordHash: 0 }).lean();
    if (user === null) {
      throw new AppError("User not found", 404, "user_not_found");
    }
    res.status(200).json({ item: user });
  } catch (err) {
    next(err);
  }
};

export const updateUserRoleHandler: RequestHandler = async (req, res, next) => {
  try {
    const params = requireValidatedParams<z.infer<typeof userIdParamsSchema>>(req);
    const body = requireValidatedBody<z.infer<typeof updateRoleBodySchema>>(req);
    const updated = await UserModel.findByIdAndUpdate(
      params.id,
      { $set: { role: body.role } },
      { new: true, projection: { passwordHash: 0 } },
    ).lean();
    if (updated === null) {
      throw new AppError("User not found", 404, "user_not_found");
    }
    res.status(200).json({ item: updated });
  } catch (err) {
    next(err);
  }
};
