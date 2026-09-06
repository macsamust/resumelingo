-- Durable, never-pruned security signal log — separate from the existing
-- IP-throttle tables (email_verification_ip_log, admin_login_ip_log), which
-- must stay short-lived to keep them cheap to query on every request. This
-- table is written to only when an existing throttle actually trips (a 429
-- is returned) or a daily scan (see SecurityMonitorService) finds an
-- admin-side anomaly in the durable admin_audit_log — one row per crossed
-- threshold, not per request, so it stays small. Backs the Admin Console's
-- Security Report page and the immediate/daily email alerts (see
-- SecurityAlertService, EmailService.sendSecurityAlertEmail/
-- sendSecurityDailyDigestEmail).
CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  ip TEXT,
  detail TEXT,
  "createdAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_events_createdAt ON security_events("createdAt");
CREATE INDEX IF NOT EXISTS idx_security_events_type_ip_createdAt ON security_events(type, ip, "createdAt");

-- IP + resume-slug throttle for password-protected public resume links (see
-- PublicController.getBySlug) — closes a gap the Sep 2026 security-anomaly
-- scoping found: guessing one specific resume's password had zero friction
-- and zero trace. Keyed by (ip, slug) rather than a blanket per-IP count
-- like email_verification_ip_log, since the attacker's goal here is
-- guessing one target's password, not raw volume.
CREATE TABLE IF NOT EXISTS public_resume_password_ip_log (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  slug TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_resume_password_ip_log_ip_slug_createdAt
  ON public_resume_password_ip_log(ip, slug, "createdAt");
