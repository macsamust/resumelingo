import { Pool } from "pg";
import { nanoid } from "nanoid";

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
      "accessPasswordExpiresAt" TEXT,
      "coverLetterEnabled" BOOLEAN NOT NULL DEFAULT false,
      "generatedCoverLetter" TEXT NOT NULL DEFAULT '',
      "recruiterModeEnabled" BOOLEAN NOT NULL DEFAULT false,
      "recruiterLocation" TEXT NOT NULL DEFAULT '',
      "recruiterAvailability" TEXT NOT NULL DEFAULT '',
      "recruiterClearance" TEXT NOT NULL DEFAULT '',
      "recruiterWorkAuthorization" TEXT NOT NULL DEFAULT '',
      "recruiterExpectedSalary" TEXT NOT NULL DEFAULT '',
      "recruiterRemotePreference" TEXT NOT NULL DEFAULT '',
      "combineExperienceFormat" BOOLEAN NOT NULL DEFAULT false,
      "answers" TEXT NOT NULL DEFAULT '{}',
      "experience" TEXT NOT NULL DEFAULT '[]',
      "education" TEXT NOT NULL DEFAULT '[]',
      "awards" TEXT NOT NULL DEFAULT '[]',
      "achievements" TEXT NOT NULL DEFAULT '[]',
      "skillsAndTools" TEXT NOT NULL DEFAULT '[]',
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

    -- Optional expiration for a password-protected resume link: once past,
    -- the link is deactivated (getPublicBySlug in ResumeService rejects it
    -- with reason "expired") even with the correct password. NULL means no
    -- expiration. Only meaningful when visibility = 'password', but not
    -- enforced at the column level since it's harmless to keep a leftover
    -- value around if someone switches visibility away and back.
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "accessPasswordExpiresAt" TEXT;

    -- "Generate AI cover letter" checkbox (New Resume + Edit Resume) — only
    -- offered for resumes on a Premium-tier template (see
    -- ResumeService.create/update, which enforces that gate server-side
    -- too, not just hides the checkbox client-side). generatedCoverLetter
    -- is the rule-based generator's output (see CoverLetterGenerator.ts),
    -- regenerated on the same triggers as generatedSummary/generatedBullets.
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "coverLetterEnabled" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "generatedCoverLetter" TEXT NOT NULL DEFAULT '';

    -- "Recruiter Mode" (Edit Resume, Premium only — enforced server-side in
    -- ResumeService.update, not just hidden client-side) adds a candidate
    -- summary card to the public resume link. All fields nullable/optional;
    -- "skills" isn't stored here at all — it's derived at read time from
    -- generatedBullets/answers (see Resume.recruiterCard / utils/keywords.ts).
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "recruiterModeEnabled" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "recruiterLocation" TEXT NOT NULL DEFAULT '';
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "recruiterAvailability" TEXT NOT NULL DEFAULT '';
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "recruiterClearance" TEXT NOT NULL DEFAULT '';
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "recruiterWorkAuthorization" TEXT NOT NULL DEFAULT '';
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "recruiterExpectedSalary" TEXT NOT NULL DEFAULT '';
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "recruiterRemotePreference" TEXT NOT NULL DEFAULT '';

    -- "Combine Work Experience with Achievements" checkbox (Edit Resume, all
    -- tiers) — when true, each achievement's bullet is nested under the job
    -- it's linked to (see AchievementEntry.experienceId) instead of listed
    -- separately in a flat Highlights section. See Resume.combineExperienceFormat.
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "combineExperienceFormat" BOOLEAN NOT NULL DEFAULT false;

    -- "Skills & Tools" section (Edit Resume, Portrait template only — see
    -- ResumePreview.tsx's photo-banner-sidebar family). Picked by clicking
    -- suggested keywords rather than typed freehand, so each entry already
    -- carries its skill-vs-tool category (see types/index.ts SkillOrTool)
    -- instead of needing to be re-derived at render time. Same JSON-array
    -- pattern as "achievements" above.
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS "skillsAndTools" TEXT NOT NULL DEFAULT '[]';

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

    -- One row per public view of a resume, replacing "viewCount" (a single
    -- running total with no history) as the source for the Premium
    -- dashboard's Resume Analytics view trend (this week vs. last week,
    -- day-by-day). "viewCount" itself is left alone — the My Resumes cards
    -- and the "Total Views" tile keep reading it directly, cheaper than a
    -- COUNT(*) for a number that's shown everywhere. ON DELETE CASCADE so
    -- deleting a resume doesn't orphan its view history.
    CREATE TABLE IF NOT EXISTS resume_views (
      "id" TEXT PRIMARY KEY,
      "resumeId" TEXT NOT NULL REFERENCES resumes("id") ON DELETE CASCADE,
      "viewedAt" TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS resume_views_resume_idx ON resume_views ("resumeId");
    CREATE INDEX IF NOT EXISTS resume_views_viewed_at_idx ON resume_views ("viewedAt");

    -- One row per Resume.strengthScore snapshot, recorded every time a
    -- resume is created or updated (see ResumeService), so the Premium
    -- dashboard's Resume Analytics can show a score trend ("up 12 points
    -- this month") instead of just the current number. ON DELETE CASCADE
    -- so deleting a resume doesn't orphan its score history.
    CREATE TABLE IF NOT EXISTS resume_score_snapshots (
      "id" TEXT PRIMARY KEY,
      "resumeId" TEXT NOT NULL REFERENCES resumes("id") ON DELETE CASCADE,
      "score" INTEGER NOT NULL,
      "recordedAt" TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS resume_score_snapshots_resume_idx ON resume_score_snapshots ("resumeId");

    -- One row per ATS Check keyword match (Edit Resume, Premium — see
    -- ResumeController.recordKeywordCheck), logging which of a pasted job
    -- description's top keywords weren't found in the resume. The keyword
    -- match itself runs entirely client-side (client/src/utils/atsCheck.ts)
    -- and the job description text is never sent here — only the resulting
    -- missing-keyword words are, so the Premium dashboard's Resume Analytics
    -- can surface which keywords a user keeps missing across job postings
    -- without ever storing the postings themselves. ON DELETE CASCADE so
    -- deleting a resume doesn't orphan its keyword-check history.
    CREATE TABLE IF NOT EXISTS resume_keyword_checks (
      "id" TEXT PRIMARY KEY,
      "resumeId" TEXT NOT NULL REFERENCES resumes("id") ON DELETE CASCADE,
      "missingKeywords" TEXT NOT NULL DEFAULT '[]',
      "checkedAt" TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS resume_keyword_checks_resume_idx ON resume_keyword_checks ("resumeId");

    -- "Skills & Tools" suggestion keywords (Edit Resume, Portrait template's
    -- picker — see components/builder/SkillsAndToolsEditor.tsx) move from a
    -- static per-profession config array to a DB-backed table here, same
    -- reasoning as "templates" above: this reads as "AI-generated" to the
    -- person using it, but is actually a curated, deterministic list, so an
    -- admin should be able to edit it without a code deploy. See
    -- config/skillSuggestions.ts for the seed data and
    -- repositories/SkillSuggestionRepository.ts for admin CRUD. No
    -- in-memory cache (unlike templates) since this is only read for a
    -- picker UI, not a hot synchronous path.
    CREATE TABLE IF NOT EXISTS skill_suggestions (
      "id" TEXT PRIMARY KEY,
      "professionKey" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'skill',
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      UNIQUE ("professionKey", "label", "category")
    );
    CREATE INDEX IF NOT EXISTS skill_suggestions_profession_idx ON skill_suggestions ("professionKey");

    -- Role descriptions (the "Other" profession's About-statement voice —
    -- see ContentGenerator.ts's buildOtherSummary) move from a static
    -- config array to a DB-backed table here, same reasoning as templates
    -- and skill_suggestions above. UNLIKE skill_suggestions, this DOES use
    -- an in-memory cache (see config/roleDescriptions.ts) because
    -- findRoleDescription() is called synchronously on every resume save
    -- (ContentGenerator.generate, invoked from ResumeService.update) — the
    -- whole point of not calling a live AI model here is to keep that path
    -- instant, so it can't become an async DB round-trip per save.
    -- "isFallback" marks the single generic row used when no keyword
    -- matches (traits/keyTraits are JSON-serialized 3-element arrays).
    CREATE TABLE IF NOT EXISTS role_descriptions (
      "id" TEXT PRIMARY KEY,
      "keywords" TEXT NOT NULL DEFAULT '[]',
      "category" TEXT NOT NULL,
      "descriptor" TEXT NOT NULL,
      "traits" TEXT NOT NULL DEFAULT '[]',
      "outcome" TEXT NOT NULL,
      "keyTraits" TEXT NOT NULL DEFAULT '[]',
      "isFallback" BOOLEAN NOT NULL DEFAULT false,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      UNIQUE ("category")
    );

    -- Defensive backfill: if role_descriptions (or skill_suggestions) was
    -- ever created by an earlier version of this migration that predates
    -- its UNIQUE constraint, CREATE TABLE IF NOT EXISTS above is a no-op
    -- and the constraint never gets added — which then breaks the
    -- ON CONFLICT seed inserts below with "no unique or exclusion
    -- constraint matching the ON CONFLICT specification". These DO blocks
    -- add the constraint if it's missing, and are safe no-ops if it's
    -- already there (42710 = duplicate_object, i.e. constraint exists).
    DO $$
    BEGIN
      ALTER TABLE role_descriptions ADD CONSTRAINT role_descriptions_category_key UNIQUE ("category");
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    DO $$
    BEGIN
      ALTER TABLE skill_suggestions ADD CONSTRAINT skill_suggestions_profession_label_category_key UNIQUE ("professionKey", "label", "category");
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
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
  const { DEFAULT_SKILL_SUGGESTIONS } = await import("../config/skillSuggestions");
  const { DEFAULT_ROLE_DESCRIPTIONS } = await import("../config/roleDescriptions");
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

  // sortOrder is each row's position within its profession+category group
  // (reset per group), matching the display order the static seed list used
  // to have. ON CONFLICT on the (professionKey, label, category) uniqueness
  // constraint makes this idempotent across boots without needing a
  // deterministic id.
  const groupIndex: Record<string, number> = {};
  for (const s of DEFAULT_SKILL_SUGGESTIONS) {
    const groupKey = `${s.professionKey}::${s.category}`;
    const sortOrder = groupIndex[groupKey] ?? 0;
    groupIndex[groupKey] = sortOrder + 1;
    await pool.query(
      `INSERT INTO skill_suggestions ("id", "professionKey", "label", "category", "sortOrder", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       ON CONFLICT ("professionKey", "label", "category") DO NOTHING`,
      [nanoid(12), s.professionKey, s.label, s.category, sortOrder, now]
    );
  }

  for (let i = 0; i < DEFAULT_ROLE_DESCRIPTIONS.length; i++) {
    const r = DEFAULT_ROLE_DESCRIPTIONS[i];
    await pool.query(
      `INSERT INTO role_descriptions
         ("id", "keywords", "category", "descriptor", "traits", "outcome", "keyTraits", "isFallback", "sortOrder", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
       ON CONFLICT ("category") DO NOTHING`,
      [
        nanoid(12),
        JSON.stringify(r.keywords),
        r.category,
        r.descriptor,
        JSON.stringify(r.traits),
        r.outcome,
        JSON.stringify(r.keyTraits),
        r.isFallback ?? false,
        i,
        now,
      ]
    );
  }
}
