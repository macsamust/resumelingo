-- Tracks failed admin login attempts by IP address, independent of the
-- per-account lockout added in 0012_admin_login_lockout.sql. That lockout
-- only slows down an attacker hammering one specific admin email; it does
-- nothing to stop someone rotating through many admin emails (or guessing
-- at accounts that don't exist) from the same network. This table lets
-- AdminAuthController block further attempts from an IP that's racked up
-- too many failures recently, regardless of which account each attempt
-- targeted.
CREATE TABLE IF NOT EXISTS admin_login_ip_log (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_login_ip_log_ip_createdAt ON admin_login_ip_log(ip, "createdAt");
