import type { UserRole } from "../users/user.model.js";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};
