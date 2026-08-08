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
      "contactEmail" TEXT NOT NULL DEFAULT '',
      "contactPhone" TEXT NOT NULL DEFAULT '',
      "contactLinkedIn" TEXT NOT NULL DEFAULT '',
      "photoUrl" TEXT NOT NULL DEFAULT '',
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

    -- Adds header contact info (email, phone, LinkedIn URL) for installs
    -- whose resumes table predates these fields.
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "contactEmail" TEXT NOT NULL DEFAULT '';
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "contactPhone" TEXT NOT NULL DEFAULT '';
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "contactLinkedIn" TEXT NOT NULL DEFAULT '';

    -- Adds an optional personal photo (data: URL, resized/compressed
    -- client-side before upload) used by the "Portrait" template's header
    -- badge in place of the monogram-initials placeholder.
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "photoUrl" TEXT NOT NULL DEFAULT '';

    -- Lets an admin disable a user's login without deleting their account/data.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS "suspended" BOOLEAN NOT NULL DEFAULT false;

    -- Admins are a deliberately separate table/role from users (see
    -- types/index.ts AdminRecord and services/AdminService.ts) rather than a
    -- flag on the users table, so admin auth is fully isolated from user auth.
    CREATE TABLE IF NOT EXISTS admins (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL
    );

    -- Templates move from a static config array to a DB-backed table here so
    -- an admin can add, edit, disable, or delete them at runtime. See
    -- config/templates.ts for the in-memory cache read by the rest of the
    -- app (Resume model, public template list) and repositories/TemplateRepository.ts
    -- for admin CRUD. "sortOrder" controls display order in the template picker.
    CREATE TABLE IF NOT EXISTS templates (
      "key" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "enabled" BOOLEAN NOT NULL DEFAULT true,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );

    -- Which subscription tier a template requires ('basic' | 'upgrade' |
    -- 'premium', see TemplateCategory) so the resume editor's template
    -- picker and create/update flow can gate higher-tier templates behind
    -- the matching plan. Added nullable with no default (rather than
    -- DEFAULT 'basic' up front) so the one-time backfill in
    -- seedCatalogDefaults() below can tell "never categorized yet" (NULL)
    -- apart from an admin's real, deliberate 'basic' choice.
    ALTER TABLE templates ADD COLUMN IF NOT EXISTS "category" TEXT;

    -- Subscription plans move from a static config array to a DB-backed
    -- table here so an admin can edit displayed name/price/resume
    -- limit/features. Deliberately has no stripePriceId column — see
    -- PlanRecord in types/index.ts for why.
    CREATE TABLE IF NOT EXISTS plans (
      "tier" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "priceMonthly" REAL NOT NULL,
      "resumeLimit" INTEGER NOT NULL,
      "features" TEXT NOT NULL DEFAULT '[]',
      "updatedAt" TEXT NOT NULL
    );
  `);

  await seedCatalogDefaults();

  // Finishes the "category" backfill above: anything still NULL at this
  // point (a pre-existing custom template an admin added that isn't in
  // DEFAULT_TEMPLATES) falls back to 'basic', then the column is locked
  // down to NOT NULL with that same default for everything created from
  // here on. Both statements are idempotent — safe to run on every boot.
  await pool.query(`UPDATE templates SET "category" = 'basic' WHERE "category" IS NULL`);
  await pool.query(`ALTER TABLE templates ALTER COLUMN "category" SET DEFAULT 'basic'`);
  await pool.query(`ALTER TABLE templates ALTER COLUMN "category" SET NOT NULL`);
}

/**
 * Seeds the templates/plans tables from the original static config arrays
 * the first time each row is missing (ON CONFLICT DO NOTHING), so upgrading
 * an existing install populates the new admin-editable tables with the same
 * 15 templates and 3 plans it already had, without overwriting any admin
 * edits made since. Safe to call on every boot.
 */
async function seedCatalogDefaults(): Promise<void> {
  const { DEFAULT_TEMPLATES } = await import("../config/templates");
  const { DEFAULT_PLANS } = await import("../config/subscriptionPlans");
  const now = new Date().toISOString();

  for (let i = 0; i < DEFAULT_TEMPLATES.length; i++) {
    const t = DEFAULT_TEMPLATES[i];
    await pool.query(
      `INSERT INTO templates ("key", "name", "description", "category", "enabled", "sortOrder", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, true, $5, $6, $6)
       ON CONFLICT ("key") DO NOTHING`,
      [t.key, t.name, t.description, t.category, i, now]
    );
    // Backfills the intended category for a template row that already
    // existed before the "category" column did — never touches a row an
    // admin has since categorized themselves (category IS NOT NULL by then).
    await pool.query(`UPDATE templates SET "category" = $1 WHERE "key" = $2 AND "category" IS NULL`, [t.category, t.key]);
  }

  for (const p of DEFAULT_PLANS) {
    await pool.query(
      `INSERT INTO plans ("tier", "name", "priceMonthly", "resumeLimit", "features", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT ("tier") DO NOTHING`,
      [p.tier, p.name, p.priceMonthly, p.resumeLimit, JSON.stringify(p.features), now]
    );
  }
}
