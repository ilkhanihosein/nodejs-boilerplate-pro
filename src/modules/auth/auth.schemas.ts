import { z } from "zod";
import { USER_ROLES } from "../users/user.model.js";

/** Standard claims returned by `jsonwebtoken` when verifying with issuer/audience. */
const jwtVerifiedClaimsSchema = z.object({
  iat: z.number().optional(),
  exp: z.number().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional(),
  iss: z.string().optional(),
});

/** Access-token payload after signature verification (trust boundary). */
export const accessJwtPayloadSchema = jwtVerifiedClaimsSchema.extend({
  sub: z.string().min(1),
  email: z.email(),
  role: z.enum(USER_ROLES),
  type: z.literal("access"),
});

/** Refresh-token payload after signature verification (trust boundary). */
export const refreshJwtPayloadSchema = jwtVerifiedClaimsSchema.extend({
  sub: z.string().min(1),
  email: z.email(),
  role: z.enum(USER_ROLES),
  type: z.literal("refresh"),
  sid: z.uuid(),
});

export type JwtPayload = z.infer<typeof accessJwtPayloadSchema>;
export type RefreshJwtPayload = z.infer<typeof refreshJwtPayloadSchema>;

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 chars")
  .max(128, "Password must be at most 128 chars");

/** Register input. Role is intentionally server-controlled (default: customer). */
export const registerBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((v) => v.toLowerCase()),
  password: passwordSchema,
});

/** Login input. */
export const loginBodySchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(1),
});

/**
 * Credential carried in the JSON body for refresh and logout.
 * Must be a **refresh** JWT (opaque to clients beyond “use this string”), not an access token.
 */
const refreshTokenCredentialSchema = z.object({
  refreshToken: z.string().min(1, "refresh_token_required").max(8192, "refresh_token_too_long"),
});

/** Exchange refresh token for a new access + refresh pair. */
export const refreshBodySchema = refreshTokenCredentialSchema;

/**
 * Revoke the refresh-token session identified by this JWT.
 * Used by the **public** `POST /auth/logout` route (no `Authorization` access token, no `req.authUser`).
 */
export const logoutRefreshTokenBodySchema = refreshTokenCredentialSchema;

/** Inferred request body types (single source of truth with Zod schemas). */
export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type LogoutRefreshTokenBody = z.infer<typeof logoutRefreshTokenBodySchema>;

/** Public user slice returned with tokens and on `/auth/me`. */
export const authUserPublicSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(USER_ROLES),
});

export const authTokenPairResponseSchema = z.object({
  user: authUserPublicSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const authMeResponseSchema = z.object({
  user: authUserPublicSchema,
});

export const authLogoutOkResponseSchema = z.object({
  ok: z.literal(true),
});

export type AuthTokenPairResponse = z.infer<typeof authTokenPairResponseSchema>;
export type AuthMeResponse = z.infer<typeof authMeResponseSchema>;
export type AuthLogoutOkResponse = z.infer<typeof authLogoutOkResponseSchema>;
