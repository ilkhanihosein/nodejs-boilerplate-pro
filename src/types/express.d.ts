export {};

declare global {
  namespace Express {
    interface Request {
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
