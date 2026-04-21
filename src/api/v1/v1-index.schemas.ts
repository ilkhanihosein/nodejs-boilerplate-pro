import { z } from "zod";

export const v1IndexResponseSchema = z.object({
  ok: z.boolean(),
  api: z.string(),
  apiVersion: z.string(),
  message: z.string(),
});

export type V1IndexResponse = z.infer<typeof v1IndexResponseSchema>;
