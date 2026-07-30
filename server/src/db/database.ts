import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATABASE_FILE = process.env.DATABASE_FILE || "./data/websume.db";

/**
 * Thin wrapper around better-sqlite3 responsible only for connecting and
 * running schema migrations. Repositories (see ../repositories) own all
 * query logic — this class's job ends at "give me a working connection."
 */
class DatabaseConnection {
  public readonly db: Database.Database;

  constructor(filePath: string) {
    const dir = path.dirname(filePath);
    if (dir !== "." && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(filePath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        passwordHash TEXT NOT NULL,
        profession TEXT,
        subscriptionTier TEXT NOT NULL DEFAULT 'starter',
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        profession TEXT NOT NULL,
        templateKey TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'public',
        accessPassword TEXT,
        answers TEXT NOT NULL DEFAULT '{}',
        generatedSummary TEXT NOT NULL DEFAULT '',
        generatedBullets TEXT NOT NULL DEFAULT '[]',
        viewCount INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `);
  }
}

export const connection = new DatabaseConnection(DATABASE_FILE);
export const db = connection.db;
