-- Backs the weekly "N views this week" re-engagement digest email
-- (ViewDigestService, sent via the Worker's new scheduled/cron handler).
-- Defaults to 0 (opted in / receiving the digest) — the feature ships
-- opt-out, not opt-in, per explicit product decision (Aug 2026, see
-- TODO.md), since it's a low-frequency, clearly-labeled weekly summary
-- with a one-click unsubscribe link in every email, not marketing.
-- Only Professional/Premium subscribers are ever queried for the digest
-- (see UserRepository.findEligibleForDigest), so this column existing on
-- Starter accounts too is harmless — it's just never read for them.
ALTER TABLE users ADD COLUMN "viewDigestOptOut" INTEGER NOT NULL DEFAULT 0;
