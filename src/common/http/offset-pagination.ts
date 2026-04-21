import { z } from "zod";

/**
 * Shared query contract for offset pagination (`?page=&limit=`).
 * Use with `validateRequest({ query: offsetPaginationQuerySchema })` then `resolveOffsetPagination`.
 */
export const offsetPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type OffsetPaginationQuery = z.infer<typeof offsetPaginationQuerySchema>;

export function resolveOffsetPagination(query: OffsetPaginationQuery): {
  page: number;
  limit: number;
  skip: number;
} {
  return { page: query.page, limit: query.limit, skip: (query.page - 1) * query.limit };
}

/**
 * Cursor-style list contract (`?cursor=&limit=`). Cursor is an opaque string (e.g. encoded id).
 */
export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;
