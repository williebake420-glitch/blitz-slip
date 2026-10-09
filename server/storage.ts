import { parlays } from '@shared/schema';
import type { Parlay, InsertParlay } from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS parlays (
    id TEXT PRIMARY KEY,
    legs_json TEXT NOT NULL,
    stake REAL NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

export interface IStorage {
  createParlay(parlay: InsertParlay): Promise<Parlay>;
  getParlay(id: string): Promise<Parlay | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createParlay(insertParlay: InsertParlay): Promise<Parlay> {
    return db.insert(parlays).values(insertParlay).returning().get();
  }

  async getParlay(id: string): Promise<Parlay | undefined> {
    return db.select().from(parlays).where(eq(parlays.id, id)).get();
  }
}

export const storage = new DatabaseStorage();
