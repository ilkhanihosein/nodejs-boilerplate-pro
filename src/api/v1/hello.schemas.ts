import { z } from "zod";

export const helloQuerySchema = z.object({
  name: z.string().trim().min(1).max(64),
});

export const helloOkResponseSchema = z.object({
  message: z.string(),
  apiVersion: z.string(),
});

export type HelloOkResponse = z.infer<typeof helloOkResponseSchema>;
