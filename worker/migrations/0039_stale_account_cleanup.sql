-- Backs the stale/unverified account cleanup job (pinned in TODO.md's
-- "Bogus/unverified account protection" entry, Sep 2026 — revisiting now).
-- CJ's reasoning for the aggressive 24h window (down from the originally
-- proposed 30 days): this app's whole onboarding flow is "sign up, then
-- immediately get interviewed into your first resume" — there is no
-- legitimate path where a real signup creates an account and sits on zero
-- resumes for days or weeks. An account that's still unverified AND still
-- has zero resumes a day later is overwhelmingly a bot/junk account, not a
-- hesitant real user, so a short window carries very little false-positive
-- risk here (unlike, say, a generic SaaS signup funnel).

-- Tracks whether the warning email has already been sent, so the hourly
-- StaleAccountCleanupService job doesn't re-send it on every run before the
-- account is either verified or deleted. Null means "never warned."
ALTER TABLE users ADD COLUMN "staleAccountWarnedAt" TEXT;
