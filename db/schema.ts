import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sourceCache = sqliteTable("source_cache", {
  source: text("source").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: integer("updated_at").notNull(),
  status: text("status").notNull().default("ok"),
  error: text("error"),
});
