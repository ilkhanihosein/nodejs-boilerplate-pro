import type { Request } from "express";
import type { ZodType } from "zod";
import type { z } from "zod";

/** Validated HTTP slices after `validateRequest`; keys exist only when the matching schema is configured on the endpoint. */
export type ValidatedBag<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
> = (P extends ZodType ? { params: z.infer<P> } : { params?: undefined }) &
  (Q extends ZodType ? { query: z.infer<Q> } : { query?: undefined }) &
  (B extends ZodType ? { body: z.infer<B> } : { body?: undefined });

export type EndpointRequestShape<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
> = {
  params?: P;
  query?: Q;
  body?: B;
};

/**
 * Copies `req.validated` into the handler bag. Runtime validation already ran in
 * `validateRequest` (same Zod instances); no second parse here.
 */
export function buildValidatedBagFromRequest<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
>(req: Request, request: EndpointRequestShape<P, Q, B> | undefined): ValidatedBag<P, Q, B> {
  if (request === undefined) {
    return {} as ValidatedBag<P, Q, B>;
  }
  const slot = req.validated;
  const out: Partial<Record<"params" | "query" | "body", unknown>> = {};
  if (request.params !== undefined) {
    if (slot?.params === undefined) {
      throw new Error("Missing validated params (validateRequest must run before the handler).");
    }
    out.params = slot.params;
  }
  if (request.query !== undefined) {
    if (slot?.query === undefined) {
      throw new Error("Missing validated query (validateRequest must run before the handler).");
    }
    out.query = slot.query;
  }
  if (request.body !== undefined) {
    if (slot?.body === undefined) {
      throw new Error("Missing validated body (validateRequest must run before the handler).");
    }
    out.body = slot.body;
  }
  return out as ValidatedBag<P, Q, B>;
}
