import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import type * as z from "zod/mini";

export const parlays = sqliteTable("parlays", {
  id: text("id").primaryKey(),
  legsJson: text("legs_json").notNull(),
  stake: real("stake").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const insertParlaySchema = createInsertSchema(parlays).pick({
  id: true,
  legsJson: true,
  stake: true,
  createdAt: true,
});

export type InsertParlay = z.infer<typeof insertParlaySchema>;
export type Parlay = typeof parlays.$inferSelect;
