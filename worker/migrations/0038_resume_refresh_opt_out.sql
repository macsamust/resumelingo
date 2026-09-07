-- Follow-up to migration 0037: the cadence dropdown (60/120/360 days) had
-- no way to turn the AI Resume Refresh nudge off entirely — same gap
-- viewDigestOptOut already solves for the weekly digest, via its own
-- dedicated boolean rather than overloading the cadence column with a
-- sentinel "off" value. Defaults to 0 (opted in / receiving nudges), same
-- opt-out-not-opt-in default as viewDigestOptOut and for the same reason:
-- low-frequency, clearly labeled, one-click unsubscribe available.
ALTER TABLE users ADD COLUMN "resumeRefreshOptOut" INTEGER NOT NULL DEFAULT 0;
