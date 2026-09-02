-- Lets the app track a Stripe subscription that's scheduled to cancel at
-- the end of the current paid period (rather than only knowing "active" vs
-- "gone" after the fact) — needed for the new self-service "Cancel
-- subscription" flow on the Profile page, which cancels via
-- cancel_at_period_end: true rather than an immediate cancel, so the person
-- keeps access through what they already paid for.
ALTER TABLE users ADD COLUMN cancelAtPeriodEnd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN currentPeriodEnd TEXT;
