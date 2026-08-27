-- IP-based rate limiting for the email-verification flow (see
-- AuthController.verifyEmail/resendVerification and
-- EmailVerificationIpLogRepository), same pattern as
-- 0013_admin_login_ip_log.sql. One shared table with an "action" column
-- rather than two separate tables, since both endpoints are the same kind
-- of "throttle repeated attempts from one IP" check, just with different
-- triggers and thresholds:
--   - "verify": recorded on a failed/expired token, guards against scripted
--     token-guessing (the token itself is a 256-bit random value hashed at
--     rest, so brute force isn't realistically feasible regardless — this is
--     defense in depth against abuse, not the primary protection).
--   - "resend": recorded on every resend request regardless of outcome,
--     guards against spamming Resend's send quota / a user's own inbox.
CREATE TABLE IF NOT EXISTS email_verification_ip_log (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  action TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_verification_ip_log_ip_action_createdAt
  ON email_verification_ip_log(ip, action, "createdAt");
