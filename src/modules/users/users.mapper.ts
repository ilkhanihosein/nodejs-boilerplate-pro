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

export function toUsersListResponse(docs: UserLeanPublic[]): UsersListResponse {
  return { items: docs.map(toUserListItem) };
}

export function toUserItemResponse(doc: UserLeanPublic): UserItemResponse {
  return { item: toUserListItem(doc) };
}
