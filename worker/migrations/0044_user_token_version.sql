-- Sep 2026 security pass: regular user accounts had no way to invalidate an
-- already-issued JWT early — admins have had this (see admins.tokenVersion,
-- migration 0012) since the admin console shipped, but a leaked/stolen
-- subscriber token, or a session left open on a shared machine, had no
-- equivalent. This adds the same tokenVersion counter: AuthService bumps it
-- on password change/reset and via a new self-service "log out of all other
-- devices" action, and requireAuth/optionalAuth reject any token whose
-- embedded tokenVersion no longer matches the account's current value.
ALTER TABLE users ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
