-- Resume Analytics parity (Premium dashboard). Adds the three event-log
-- tables server/'s Postgres schema already has (see server/src/db/database.ts)
-- so DashboardController's resumeAnalytics field can be built for real here
-- instead of always returning null — see the note that was in
-- worker/src/controllers/DashboardController.ts and
-- worker/src/services/ResumeService.ts before this migration.
--
-- No `IF NOT EXISTS` / no ON DELETE CASCADE enforcement beyond the FOREIGN
-- KEY declaration itself — D1 doesn't enforce foreign keys by default
-- (PRAGMA foreign_keys is off unless a session turns it on), same as every
-- other table in this schema; deleting a resume currently doesn't cascade
-- these rows away programmatically either, matching ResumeRepository as it
-- stands today. That's an existing gap, not one introduced here.

-- One row per public resume view — see ResumeService.getPublicBySlug, which
-- calls this alongside the always-visible resumes.viewCount increment. Feeds
-- the Premium view-trend chart only.
CREATE TABLE resume_views (
  "id" TEXT PRIMARY KEY,
  "resumeId" TEXT NOT NULL REFERENCES resumes("id"),
  "viewedAt" TEXT NOT NULL
);
CREATE INDEX resume_views_resume_idx ON resume_views ("resumeId");
CREATE INDEX resume_views_viewed_at_idx ON resume_views ("viewedAt");

-- One row per Resume.strengthScore snapshot, recorded every time a resume is
-- created, updated, or cloned (see ResumeService), so the Premium dashboard's
-- Resume Analytics can show a score trend ("up 12 points this month")
-- instead of just the current number.
CREATE TABLE resume_score_snapshots (
  "id" TEXT PRIMARY KEY,
  "resumeId" TEXT NOT NULL REFERENCES resumes("id"),
  "score" INTEGER NOT NULL,
  "recordedAt" TEXT NOT NULL
);
CREATE INDEX resume_score_snapshots_resume_idx ON resume_score_snapshots ("resumeId");

-- One row per ATS Check keyword match (Edit Resume, Premium — see
-- ResumeController.recordKeywordCheck), logging which of a pasted job
-- description's top keywords weren't found in the resume. The keyword match
-- itself runs entirely client-side (client/src/utils/atsCheck.ts) and the
-- job description text is never sent here — only the resulting
-- missing-keyword words are, so the Premium dashboard's Resume Analytics can
-- surface which keywords a user keeps missing across job postings without
-- ever storing the postings themselves.
CREATE TABLE resume_keyword_checks (
  "id" TEXT PRIMARY KEY,
  "resumeId" TEXT NOT NULL REFERENCES resumes("id"),
  "missingKeywords" TEXT NOT NULL DEFAULT '[]',
  "checkedAt" TEXT NOT NULL
);
CREATE INDEX resume_keyword_checks_resume_idx ON resume_keyword_checks ("resumeId");
