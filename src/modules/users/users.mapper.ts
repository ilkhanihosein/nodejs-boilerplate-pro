import type { UserLeanPublic } from "./user.model.js";
import type { UserItemResponse, UserListItem, UsersListResponse } from "./users.schemas.js";

export function toUserListItem(doc: UserLeanPublic): UserListItem {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
  };
}

export function toUsersListResponse(
  docs: UserLeanPublic[],
  meta: { page: number; limit: number; total: number },
): UsersListResponse {
  return {
    items: docs.map(toUserListItem),
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
  };
}

export function toUserItemResponse(doc: UserLeanPublic): UserItemResponse {
  return { item: toUserListItem(doc) };
}
