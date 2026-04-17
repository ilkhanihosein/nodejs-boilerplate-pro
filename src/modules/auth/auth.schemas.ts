import { z } from "zod";

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

/** Refresh/logout input. */
export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

/** Inferred request body types (single source of truth with Zod schemas). */
export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
