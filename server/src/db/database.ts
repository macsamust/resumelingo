import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (see server/.env.example — e.g. Render's Postgres 'External Database URL').");
}

/**
 * Connection pool for Postgres (via `pg`), replacing the better-sqlite3 file
 * database this project started with. Render's free web services have an
 * ephemeral filesystem — a local SQLite file gets wiped on every redeploy,
 * restart, or idle spin-down — so persisting real data on Render means using
 * a real database service (Render Postgres) instead.
 *
 * Column names are double-quoted throughout (here and in every repository
 * query) so Postgres preserves the exact camelCase used everywhere else in
 * this codebase (models, types, and the D1 schema in worker/). Unquoted
 * identifiers get folded to lowercase by Postgres, which would silently
 * break every `record.foo` access on the JS side.
 */
export const pool = new Pool({
  connectionString: DATABASE_URL,
  // Render (and most managed Postgres hosts) terminate TLS with a
  // certificate that isn't in Node's default trust store. This is the
  // standard workaround for that, rather than disabling SSL outright.
  // Local Postgres (no TLS at all) doesn't need this.
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

/** Creates the schema if it doesn't exist yet. Safe to call on every boot. */
export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "profession" TEXT,
      "subscriptionTier" TEXT NOT NULL DEFAULT 'starter',
      "stripeCustomerId" TEXT,
      "stripeSubscriptionId" TEXT,
      "createdAt" TEXT NOT NULL
    );

    -- Adds Stripe billing columns for installs whose users table already
    -- existed before subscription billing was wired up. Safe to run on every
    -- boot: IF NOT EXISTS makes this a no-op once the columns are present.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;

    CREATE TABLE IF NOT EXISTS resumes (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES users("id"),
      "slug" TEXT NOT NULL UNIQUE,
      "fullName" TEXT NOT NULL DEFAULT '',
      "title" TEXT NOT NULL,
      "profession" TEXT NOT NULL,
      "templateKey" TEXT NOT NULL,
      "visibility" TEXT NOT NULL DEFAULT 'public',
      "accessPassword" TEXT,
      "answers" TEXT NOT NULL DEFAULT '{}',
      "experience" TEXT NOT NULL DEFAULT '[]',
      "education" TEXT NOT NULL DEFAULT '[]',
      "awards" TEXT NOT NULL DEFAULT '[]',
      "achievements" TEXT NOT NULL DEFAULT '[]',
      "generatedSummary" TEXT NOT NULL DEFAULT '',
      "generatedBullets" TEXT NOT NULL DEFAULT '[]',
      "viewCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );

    -- Adds the person's full name for installs whose resumes table already
    -- existed before this field was added. Safe to run on every boot.
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "fullName" TEXT NOT NULL DEFAULT '';

    -- Adds structured, chronologically-ordered work history (company, title,
    -- start/end dates, "currently work here") for installs whose resumes
    -- table predates this field. Stored as a JSON-serialized array, same
    -- pattern as "answers" and "generatedBullets" above.
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "experience" TEXT NOT NULL DEFAULT '[]';

    -- Adds education history and awards/honors, same JSON-array pattern as
    -- "experience" above, for installs whose resumes table predates them.
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "education" TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "awards" TEXT NOT NULL DEFAULT '[]';

    -- Adds structured Challenge/Action/Result achievement entries, which
    -- ContentGenerator.ts turns into STAR-method bullets (see that file).
    -- Same JSON-array pattern as "experience" above.
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "achievements" TEXT NOT NULL DEFAULT '[]';
  `);
}
