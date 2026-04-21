import jwt from "jsonwebtoken";
import type { Secret, SignOptions, VerifyOptions } from "jsonwebtoken";
import { z } from "zod";

import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import {
  accessJwtPayloadSchema,
  refreshJwtPayloadSchema,
  type JwtPayload,
  type RefreshJwtPayload,
} from "./auth.schemas.js";

function jwtVerifyOptions(): VerifyOptions {
  return {
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
  };
}

type VerifyAndParseJwtParams<T> = {
  token: string;
  secret: Secret;
  verifyOptions: VerifyOptions;
  schema: z.ZodType<T>;
  payloadInvalidMessage: string;
  cryptoInvalidMessage: string;
};

/**
 * Runs JWT cryptographic verification, then Zod structural validation.
 * Both steps stay explicit; this only deduplicates the surrounding guard + error mapping.
 */
function verifyAndParseJwt<T>({
  token,
  secret,
  verifyOptions,
  schema,
  payloadInvalidMessage,
  cryptoInvalidMessage,
}: VerifyAndParseJwtParams<T>): T {
  try {
    const decoded = jwt.verify(token, secret, verifyOptions);

    if (typeof decoded !== "object") {
      throw new AppError(payloadInvalidMessage, 401, "unauthorized");
    }

    return schema.parse(decoded);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    if (err instanceof z.ZodError) {
      throw new AppError(payloadInvalidMessage, 401, "unauthorized");
    }
    throw new AppError(cryptoInvalidMessage, 401, "unauthorized");
  }
}

/** Issue access JWT. */
export function signAccessToken(payload: Omit<JwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "access" }, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessTtl as NonNullable<SignOptions["expiresIn"]>,
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
  });
}

/** Issue refresh JWT. */
export function signRefreshToken(payload: Omit<RefreshJwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "refresh" }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshTtl as NonNullable<SignOptions["expiresIn"]>,
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
  });
}

/** Verify access token signature, expiry, iss/aud, and required claims. */
export function verifyAccessToken(token: string): JwtPayload {
  return verifyAndParseJwt({
    token,
    secret: env.jwtAccessSecret,
    verifyOptions: jwtVerifyOptions(),
    schema: accessJwtPayloadSchema,
    payloadInvalidMessage: "Invalid token payload",
    cryptoInvalidMessage: "Invalid or expired token",
  });
}

/** Verify refresh token signature, expiry, iss/aud, and required claims. */
export function verifyRefreshToken(token: string): RefreshJwtPayload {
  return verifyAndParseJwt({
    token,
    secret: env.jwtRefreshSecret,
    verifyOptions: jwtVerifyOptions(),
    schema: refreshJwtPayloadSchema,
    payloadInvalidMessage: "Invalid refresh token payload",
    cryptoInvalidMessage: "Invalid or expired refresh token",
  });
}
