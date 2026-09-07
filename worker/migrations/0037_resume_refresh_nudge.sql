-- Backs the AI Resume Refresh nudge email (finalized scope, Sep 2026 — see
-- TODO.md's "AI Resume Refresh nudge email" entry). Professional/Premium
-- only, same tier gate as Version History/Job Tracker — enforced in the
-- new nudge service, not by this column existing on every tier (harmless
-- and simply unused on Starter accounts, same reasoning as
-- viewDigestOptOut in migration 0016).

-- One setting per account, not per resume — the subscriber picks how often
-- (in days) they want to be nudged about a resume going stale; applies to
-- every resume on the account. Lives in the same Profile "Email
-- preferences" section as the weekly view-digest checkbox. Defaults to 120
-- (the original single-threshold proposal) so an existing account that
-- never visits Profile still gets a sensible default rather than an unset
-- value needing a null-check everywhere this is read.
ALTER TABLE users ADD COLUMN "resumeRefreshCadenceDays" INTEGER NOT NULL DEFAULT 120;

-- Per-resume, not per-account — tracks the last time *this* resume was
-- nudged, so the daily cron doesn't re-send every single run once a resume
-- crosses its account's cadence threshold. Null means "never nudged yet."
-- Deliberately not reset by a normal resume edit alone; see
-- ResumeRefreshNudgeService's own doc comment for the "only re-nudge once
-- the subscriber has actually gone quiet again" logic once that service
-- exists.
ALTER TABLE resumes ADD COLUMN "lastRefreshNudgeSentAt" TEXT;
