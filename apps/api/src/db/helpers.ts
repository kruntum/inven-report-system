import { isNull } from "drizzle-orm";

/**
 * Helper to filter out records that have been soft-deleted.
 * Usage:
 *   db.select().from(companies).where(notDeleted(companies))
 */
export function notDeleted<T extends { deletedAt: any }>(table: T) {
  return isNull(table.deletedAt);
}
