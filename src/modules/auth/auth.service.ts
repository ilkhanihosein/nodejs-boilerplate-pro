import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import { UserModel } from "../users/user.model.js";
import { RefreshTokenSessionModel } from "./refresh-token.model.js";
import type { AuthenticatedUser, JwtPayload, RefreshJwtPayload } from "./auth.types.js";

const SALT_ROUNDS = 10;

/** Hash user password before persistence. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Compare candidate password with stored hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Hash refresh token before DB write (never store raw token). */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create short-lived stateless access token. */
export function signAccessToken(payload: Omit<JwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "access" }, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessTtl as NonNullable<SignOptions["expiresIn"]>,
    issuer: "e-commerce-api",
    audience: "e-commerce-client",
  });
}

/** Verify access token integrity and required claims. */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret, {
      issuer: "e-commerce-api",
      audience: "e-commerce-client",
    });

    if (typeof decoded !== "object") {
      throw new AppError("Invalid token payload", 401, "unauthorized");
    }
    const payload = decoded as Partial<JwtPayload>;
    if (!payload.sub || !payload.email || !payload.role || payload.type !== "access") {
      throw new AppError("Invalid token payload", 401, "unauthorized");
    }

    return payload as JwtPayload;
  } catch {
    throw new AppError("Invalid or expired token", 401, "unauthorized");
  }
}

/** Create long-lived refresh token; session is enforced in DB. */
function signRefreshToken(payload: Omit<RefreshJwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "refresh" }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshTtl as NonNullable<SignOptions["expiresIn"]>,
    issuer: "e-commerce-api",
    audience: "e-commerce-client",
  });
}

/** Verify refresh token signature and required claims. */
function verifyRefreshToken(token: string): RefreshJwtPayload {
  try {
    const decoded = jwt.verify(token, env.jwtRefreshSecret, {
      issuer: "e-commerce-api",
      audience: "e-commerce-client",
    });
    if (typeof decoded !== "object") {
      throw new AppError("Invalid refresh token payload", 401, "unauthorized");
    }
    const payload = decoded as Partial<RefreshJwtPayload>;
    if (
      !payload.sub ||
      !payload.email ||
      !payload.role ||
      !payload.sid ||
      payload.type !== "refresh"
    ) {
      throw new AppError("Invalid refresh token payload", 401, "unauthorized");
    }
    return payload as RefreshJwtPayload;
  } catch {
    throw new AppError("Invalid or expired refresh token", 401, "unauthorized");
  }
}

/**
 * Issues a new token pair and persists refresh-session state.
 * If previousSessionId exists, the old session is revoked (rotation).
 */
async function issueSession(
  user: AuthenticatedUser,
  previousSessionId?: string,
): Promise<{ user: AuthenticatedUser; accessToken: string; refreshToken: string }> {
  const sessionId = randomUUID();

  const refreshToken = signRefreshToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    sid: sessionId,
  });

  const payload = verifyRefreshToken(refreshToken);
  if (typeof payload.exp !== "number") {
    throw new AppError("Invalid refresh token payload", 401, "unauthorized");
  }

  await RefreshTokenSessionModel.create({
    userId: user.id,
    sessionId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(payload.exp * 1000),
    revokedAt: null,
  });

  if (previousSessionId) {
    await RefreshTokenSessionModel.updateOne(
      { sessionId: previousSessionId, revokedAt: null },
      {
        $set: {
          revokedAt: new Date(),
          replacedBySessionId: sessionId,
        },
      },
    );
  }

  return {
    user,
    accessToken: signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    }),
    refreshToken,
  };
}

/** Register user and start first authenticated session. */
export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: AuthenticatedUser; accessToken: string; refreshToken: string }> {
  const email = input.email.toLowerCase();

  const exists = await UserModel.findOne({ email }).lean();

  if (exists) {
    throw new AppError("Email already exists", 409, "email_conflict");
  }

  const userDoc = await UserModel.create({
    name: input.name,
    email,
    passwordHash: await hashPassword(input.password),
    role: "customer",
  });

  const user: AuthenticatedUser = {
    id: userDoc.id,
    email: userDoc.email,
    role: userDoc.role,
  };

  return issueSession(user);
}

/** Login user and start a new authenticated session. */
export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ user: AuthenticatedUser; accessToken: string; refreshToken: string }> {
  const email = input.email.toLowerCase();

  const userDoc = await UserModel.findOne({ email });

  if (!userDoc) {
    throw new AppError("Invalid credentials", 401, "invalid_credentials");
  }

  const ok = await verifyPassword(input.password, userDoc.passwordHash);

  if (!ok) {
    throw new AppError("Invalid credentials", 401, "invalid_credentials");
  }

  const user: AuthenticatedUser = {
    id: userDoc.id,
    email: userDoc.email,
    role: userDoc.role,
  };

  return issueSession(user);
}

/** Rotate refresh session and return a fresh token pair. */
export async function refreshSessionTokens(input: {
  refreshToken: string;
}): Promise<{ user: AuthenticatedUser; accessToken: string; refreshToken: string }> {
  const payload = verifyRefreshToken(input.refreshToken);

  const session = await RefreshTokenSessionModel.findOne({
    sessionId: payload.sid,
    tokenHash: hashToken(input.refreshToken),
  });

  if (!session || session.revokedAt) {
    throw new AppError("Invalid session", 401, "unauthorized");
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await RefreshTokenSessionModel.updateOne(
      { _id: session._id },
      { $set: { revokedAt: new Date() } },
    );

    throw new AppError("Session expired", 401, "unauthorized");
  }

  const user = await UserModel.findById(payload.sub);

  if (!user) {
    throw new AppError("User not found", 401, "unauthorized");
  }

  return issueSession({ id: user.id, email: user.email, role: user.role }, payload.sid);
}

/** Revoke one refresh session (logout current device/session). */
export async function logoutSession(input: { refreshToken: string }): Promise<void> {
  const payload = verifyRefreshToken(input.refreshToken);

  await RefreshTokenSessionModel.updateOne(
    {
      sessionId: payload.sid,
      tokenHash: hashToken(input.refreshToken),
    },
    {
      $set: { revokedAt: new Date() },
    },
  );
}
