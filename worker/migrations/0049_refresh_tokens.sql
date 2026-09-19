-- SEC-A01 (Sep 2026): moves subscriber auth off a localStorage JWT read via
-- Authorization header onto a short-lived HttpOnly access-token cookie plus
-- this table's long-lived, revocable refresh token. The access-token cookie
-- alone already closes the original finding (JS can't read an HttpOnly
-- cookie, so XSS can no longer steal it) — this table exists so a leaked
-- refresh token isn't a standing 7-day credential with no kill switch, the
-- same way tokenVersion already lets login JWTs be invalidated early.
--
-- The refresh token value itself is never stored — only its SHA-256 hash
-- (tokenHash), same principle as the existing password-reset and
-- email-verification tokens (see AuthService's sha256Hex usage): the value
-- is already high-entropy random, so a fast hash is fine, and a stolen copy
-- of this table alone can't be replayed as a live session.
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "expiresAt" TEXT NOT NULL,
  -- Set the moment the token is used to refresh (v1 has no rotation, so this
  -- only gets set by an explicit logout or a revoke-all-sessions action, not
  -- by every refresh call) or is superseded by a revoke-all action
  -- (password change, "log out everywhere"). NULL means still valid.
  "revokedAt" TEXT
);

CREATE INDEX "idx_refresh_tokens_token_hash" ON refresh_tokens ("tokenHash");
CREATE INDEX "idx_refresh_tokens_user_id" ON refresh_tokens ("userId");
