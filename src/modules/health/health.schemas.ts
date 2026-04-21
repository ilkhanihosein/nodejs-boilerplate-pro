import { z } from "zod";

export const healthLivenessResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  apiVersion: z.string(),
  gitSha: z.string().optional(),
});

export const healthReadyResponseSchema = z.object({
  status: z.enum(["ready", "not_ready"]),
  service: z.string(),
  apiVersion: z.string(),
  gitSha: z.string().optional(),
  mongo: z.object({
    readyState: z.number(),
    state: z.string(),
  }),
});

export type HealthLivenessResponse = z.infer<typeof healthLivenessResponseSchema>;
export type HealthReadyResponse = z.infer<typeof healthReadyResponseSchema>;
