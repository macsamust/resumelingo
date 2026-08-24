-- Email verification (see AuthService.register/updateProfile/verifyEmail/
-- resendVerificationEmail) plus a one-time email case-normalization pass.
-- Neither of these gates login or any existing feature — this is a "track +
-- nudge" rollout (AppShell shows a dismissible banner for unverified
-- accounts), not an access-control change. See TODO.md's email-handling
-- audit for the fuller list of gaps this doesn't cover.

-- Defaults to 0 (unverified) so every future INSERT (new signups, and any
-- email address change — see AuthService.updateProfile) starts unverified
-- until the token-based confirm flow runs. Immediately backfilled to 1
-- below for every account that already exists as of this migration —
-- there's no way to retroactively know whether those addresses were ever
-- really confirmed, so grandfathering them in (rather than defaulting to 0
-- and surprising the entire current user base with a "verify your email"
-- banner) is the explicit product decision here.
ALTER TABLE users ADD COLUMN "emailVerified" INTEGER NOT NULL DEFAULT 0;
UPDATE users SET "emailVerified" = 1;

-- Same hashed-token-only storage pattern as resetTokenHash/resetTokenExpiresAt
-- — never store the raw token, only its SHA-256 hash (see AuthService's
-- existing sha256Hex helper, reused here).
ALTER TABLE users ADD COLUMN "verificationTokenHash" TEXT;
ALTER TABLE users ADD COLUMN "verificationTokenExpiresAt" TEXT;

-- One-time case-insensitive normalization (UserRepository.findByEmail now
-- matches on LOWER(email) regardless, and every future write lowercases
-- first — see AuthService.register/updateProfile) — this just cleans up
-- whatever's already in the table. Skips any row that would collide with
-- another existing user's email once lowercased, since "email" is a UNIQUE
-- column and this migration must not silently merge or drop an account by
-- forcing two rows to the same value. Any skipped collision (two accounts
-- that are really the same address in different casing) needs manual
-- review — flagged in TODO.md rather than resolved automatically here.
UPDATE users
SET email = LOWER(email)
WHERE email <> LOWER(email)
  AND NOT EXISTS (
    SELECT 1 FROM users u2 WHERE u2.id <> users.id AND LOWER(u2.email) = LOWER(users.email)
  );
