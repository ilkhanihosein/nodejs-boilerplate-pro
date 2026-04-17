export {};

declare global {
  namespace Express {
    interface Request {
      /** Request correlation id (`bindRequestContext`, echoed as `X-Request-Id`). */
      id?: string;
      /** Wall time (`Date.now()`) at request entry; set in `bindRequestContext` before logging middleware. */
      requestStartedAtMs?: number;
      /** Populated by `validateRequest` after successful Zod parsing. */
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
      authUser?: {
        id: string;
        email: string;
        role: "customer" | "admin";
      };
    }
  }
}
