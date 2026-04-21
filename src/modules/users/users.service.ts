import { AppError } from "../../common/errors/app-error.js";
import {
  DEFAULT_MONGO_SORT_CREATED_AT_DESC,
  mongoSortFromSortQuery,
} from "../../common/http/sort-query.js";
import { getLogger } from "../../common/logger.js";
import type { UserLeanPublic } from "./user.model.js";
import { UserModel } from "./user.model.js";
import { toUserItemResponse, toUsersListResponse } from "./users.mapper.js";
import {
  USER_LIST_SORT_FIELDS,
  type UpdateRoleBody,
  type UserIdParams,
  type UserItemResponse,
  type UsersListQuery,
  type UsersListResponse,
} from "./users.schemas.js";

export async function listUsers(query: UsersListQuery): Promise<UsersListResponse> {
  getLogger().debug({ event: "list_users" }, "list_users");
  const sort = mongoSortFromSortQuery(
    query.sort,
    USER_LIST_SORT_FIELDS,
    DEFAULT_MONGO_SORT_CREATED_AT_DESC,
  );
  const users = await UserModel.find({}, { passwordHash: 0 }).sort(sort).lean<UserLeanPublic[]>();
  return toUsersListResponse(users);
}

export async function getUserById(params: UserIdParams): Promise<UserItemResponse> {
  const user = await UserModel.findById(params.id, {
    passwordHash: 0,
  }).lean<UserLeanPublic | null>();
  if (user === null) {
    throw new AppError("User not found", 404, "user_not_found");
  }
  return toUserItemResponse(user);
}

export async function updateUserRole(
  params: UserIdParams,
  body: UpdateRoleBody,
): Promise<UserItemResponse> {
  const updated = await UserModel.findByIdAndUpdate(
    params.id,
    { $set: { role: body.role } },
    { new: true, projection: { passwordHash: 0 } },
  ).lean<UserLeanPublic | null>();
  if (updated === null) {
    throw new AppError("User not found", 404, "user_not_found");
  }
  return toUserItemResponse(updated);
}
