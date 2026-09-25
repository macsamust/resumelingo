-- Backs the Admin Console's Email Templates preview page (CJ, Sep 2026:
-- wanted a way to see every email the app sends and its trigger, plus a
-- place to leave a comment/note per template — e.g. "this one needs a copy
-- update" — without that note living only in someone's memory or a Slack
-- thread). One row per template key, upserted from AdminEmailTemplateController
-- rather than versioned/history-tracked — this is a working note, not an
-- audit trail (the admin_audit_log table already exists for actual admin
-- actions; a comment on an email template isn't one).
CREATE TABLE email_template_notes (
  templateKey TEXT PRIMARY KEY,
  note TEXT NOT NULL DEFAULT '',
  updatedAt TEXT NOT NULL,
  updatedByAdminEmail TEXT
);
