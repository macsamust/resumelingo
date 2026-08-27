-- Admin-console hardening pass (Aug 2026 pre-launch security review — see
-- TODO.md's "Admin console — security/access hardening" section). Three
-- pieces land in one migration since they all touch the same two tables:
--
-- 1. Session revocation for stateless admin JWTs — tokenVersion is embedded
--    in every signed token (see AdminTokenPayload) and checked against this
--    column on every request (see requireAdminAuth); bumping it invalidates
--    every previously-issued token at once, without needing a token
--    denylist table.
-- 2. TOTP two-factor login — totpSecret/totpEnabled/totpBackupCodeHashes.
--    Backup codes are non-negotiable here: this is a solo-admin console
--    today, so losing the authenticator app with no recovery path would be
--    a total, unrecoverable lockout.
-- 3. Tamper-evident audit log — a hash column on admin_audit_log, chained
--    to the previous row's hash (see AdminAuditLogRepository.log). Existing
--    rows get an empty hash rather than a computed one — SQLite has no
--    built-in SHA-256, so backfilling a real chain for pre-existing history
--    isn't possible from plain SQL. The chain is only verifiable from the
--    first post-migration row forward; see verifyChainIntegrity()'s doc
--    comment for how that's surfaced rather than silently glossed over.

ALTER TABLE admins ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admins ADD COLUMN "totpSecret" TEXT;
ALTER TABLE admins ADD COLUMN "totpEnabled" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admins ADD COLUMN "totpBackupCodeHashes" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE admin_audit_log ADD COLUMN "hash" TEXT NOT NULL DEFAULT '';
