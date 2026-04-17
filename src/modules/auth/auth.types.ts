import type { UserRole } from "../users/user.model.js";

/** Access-token claims used by protected HTTP endpoints. */
export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  type: "access";
  exp?: number;
};

/** Refresh-token claims used for session rotation and revocation. */
export type RefreshJwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  type: "refresh";
  sid: string;
  exp?: number;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};
