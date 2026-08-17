-- Self-service password reset. A single active token per user (a new
-- request just overwrites these two columns, invalidating any earlier
-- link) — no separate table needed since only one reset can be in flight
-- at a time. Only the SHA-256 hash of the raw token is stored, same
-- principle as password hashing: the actual token value only ever exists
-- in the email link and briefly in memory, never at rest.
ALTER TABLE users ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE users ADD COLUMN "resetTokenExpiresAt" TEXT;
