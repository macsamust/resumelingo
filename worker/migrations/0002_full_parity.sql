-- Brings the D1 "resumes" table to parity with server/'s Postgres schema
-- (see server/src/db/database.ts) for the Resume/User/Auth/Dashboard/
-- Public-view feature set: full name + header contact info, structured work
-- history/education/awards/achievements, a personal photo, AI cover letter,
-- Recruiter Mode, combine-experience-format, Skills & Tools, and References.
-- See worker/src/types/index.ts's ResumeRecord for the corresponding TS
-- fields and worker/src/models/Resume.ts for how each one is used.
--
-- The "users" table needs no changes here — server/'s only extra columns
-- there (stripeCustomerId, stripeSubscriptionId, suspended) back Stripe
-- billing and the admin console, both explicitly out of scope for this pass.
--
-- D1/SQLite has no native boolean type, so boolean columns are INTEGER with
-- a 0/1 default; BaseRepository.insertRow/updateRow convert JS booleans to
-- 0/1 before binding, and Resume.ts coerces 0/1 back to real booleans when
-- constructing the model from a raw row.
--
-- Unlike server/'s migrate() (which re-runs `ALTER TABLE ... ADD COLUMN IF
-- NOT EXISTS` against Postgres on every boot), D1 tracks which migrations
-- have already been applied and only runs each one once, so no IF NOT
-- EXISTS guard is needed — or supported — here.
--
-- "references" is quoted because it collides with the SQL REFERENCES
-- keyword; BaseRepository now double-quotes every column name it builds
-- dynamically so this (and any other keyword-shaped column) binds safely.

ALTER TABLE resumes ADD COLUMN "fullName" TEXT NOT NULL DEFAULT '';
ALTER TABLE resumes ADD COLUMN "contactEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE resumes ADD COLUMN "contactPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE resumes ADD COLUMN "contactLinkedIn" TEXT NOT NULL DEFAULT '';
ALTER TABLE resumes ADD COLUMN "photoUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE resumes ADD COLUMN "accessPasswordExpiresAt" TEXT;
ALTER TABLE resumes ADD COLUMN "coverLetterEnabled" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE resumes ADD COLUMN "generatedCoverLetter" TEXT NOT NULL DEFAULT '';
ALTER TABLE resumes ADD COLUMN "recruiterModeEnabled" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE resumes ADD COLUMN "recruiterLocation" TEXT NOT NULL DEFAULT '';
ALTER TABLE resumes ADD COLUMN "recruiterAvailability" TEXT NOT NULL DEFAULT '';
ALTER TABLE resumes ADD COLUMN "recruiterClearance" TEXT NOT NULL DEFAULT '';
ALTER TABLE resumes ADD COLUMN "recruiterWorkAuthorization" TEXT NOT NULL DEFAULT '';
ALTER TABLE resumes ADD COLUMN "recruiterExpectedSalary" TEXT NOT NULL DEFAULT '';
ALTER TABLE resumes ADD COLUMN "recruiterRemotePreference" TEXT NOT NULL DEFAULT '';
ALTER TABLE resumes ADD COLUMN "combineExperienceFormat" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE resumes ADD COLUMN "experience" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE resumes ADD COLUMN "education" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE resumes ADD COLUMN "awards" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE resumes ADD COLUMN "achievements" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE resumes ADD COLUMN "skillsAndTools" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE resumes ADD COLUMN "referencesEnabled" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE resumes ADD COLUMN "references" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE resumes ADD COLUMN "referencesRecruiterModeOnly" INTEGER NOT NULL DEFAULT 0;
