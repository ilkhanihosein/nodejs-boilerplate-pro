import type { Request, RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import { verifyAccessToken } from "../../modules/auth/auth.service.js";
import type { AuthenticatedUser } from "../../modules/auth/auth.types.js";
import type { UserRole } from "../../modules/users/user.model.js";

/** `Request` after `requireAuth` has run successfully. */
export type AuthenticatedRequest = Request & { authUser: AuthenticatedUser };

function readBearerToken(authorization: string | undefined): string {
  if (!authorization) {
    throw new AppError("Missing authorization header", 401, "unauthorized");
  }
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AppError("Invalid authorization header", 401, "unauthorized");
  }
  return token;
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  try {
    const token = readBearerToken(req.header("authorization"));
    const payload = verifyAccessToken(token);
    req.authUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (err) {
    next(err);
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.authUser) {
      next(new AppError("Unauthorized", 401, "unauthorized"));
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      next(new AppError("Forbidden", 403, "forbidden"));
      return;
    }
    next();
  };
}
