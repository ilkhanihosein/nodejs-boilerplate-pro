import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";

import { AppError } from "../../common/errors/app-error.js";
import { getLogger } from "../../common/logger.js";
import { UserModel } from "../users/user.model.js";
import { RefreshTokenSessionModel } from "./refresh-token.model.js";
import type {
  AuthLogoutOkResponse,
  AuthMeResponse,
  AuthTokenPairResponse,
} from "./auth.schemas.js";
import type { AuthenticatedUser } from "./auth.types.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./jwt.utils.js";

const SALT_ROUNDS = 10;

export { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };

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

/**
 * Issues a new token pair and persists refresh-session state.
 * If previousSessionId exists, the old session is revoked (rotation).
 */
async function issueSession(
  user: AuthenticatedUser,
  previousSessionId?: string,
): Promise<AuthTokenPairResponse> {
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
    user: { id: user.id, email: user.email, role: user.role },
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
}): Promise<AuthTokenPairResponse> {
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

  getLogger().info({ event: "user_registered", userId: user.id }, "user_registered");
  return issueSession(user);
}

/** Login user and start a new authenticated session. */
export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthTokenPairResponse> {
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

  getLogger().debug({ event: "user_login" }, "user_login_success");
  return issueSession(user);
}

/** Rotate refresh session and return a fresh token pair. */
export async function refreshSessionTokens(input: {
  refreshToken: string;
}): Promise<AuthTokenPairResponse> {
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

export function buildAuthMeResponse(user: AuthenticatedUser): AuthMeResponse {
  return {
    user: { id: user.id, email: user.email, role: user.role },
  };
}

export function buildLogoutOkResponse(): AuthLogoutOkResponse {
  const body = { ok: true } satisfies AuthLogoutOkResponse;
  return body;
}
