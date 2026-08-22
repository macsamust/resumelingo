-- Records every sensitive admin action (who did what, to what, when) — the
-- admin console previously had zero history: suspend, delete, tier change,
-- password reset, and template/plan edits all happened with no record of
-- which admin did it. Matters the moment there's more than one admin
-- account (see 0003_admins_table.sql).
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY,
  "adminId" TEXT NOT NULL,
  "adminEmail" TEXT NOT NULL,
  action TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  detail TEXT,
  "createdAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_createdAt ON admin_audit_log("createdAt");
