-- Admin login previously had no rate-limiting at all — a brute-force
-- attempt against the admin password wasn't throttled in any way. These two
-- columns let AdminService.login lock an account out temporarily after too
-- many wrong passwords in a row, same idea as most login forms.
ALTER TABLE admins ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admins ADD COLUMN "lockedUntil" TEXT;
