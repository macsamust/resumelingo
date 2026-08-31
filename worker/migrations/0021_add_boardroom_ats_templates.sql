-- Adds the two new templates ("Boardroom" and "ATS Optimized") to the
-- D1-backed "templates" table. Editing worker/src/config/templates.ts's
-- TEMPLATES array (as done for these two) is enough for tier-gating logic
-- (assertTemplateAllowed/isPremiumTemplate, via getTemplateByKey) since that
-- reads the static array directly — but the New/Edit Resume template picker
-- itself (TemplateController.list) reads from this table instead (see
-- 0004_admin_catalog.sql's rationale: an admin can add/edit/disable
-- templates at runtime without a redeploy), so a row has to exist here too
-- or the picker never shows them regardless of what's in the static config.
-- sortOrder picked well above the existing highest value (showcase=19,
-- plus framed/emblem/spotlight added later via the admin console rather
-- than a migration) so these sort after every existing template without
-- needing to know that exact current max.
INSERT OR IGNORE INTO templates ("key", "name", "description", "category", "enabled", "sortOrder", "createdAt", "updatedAt") VALUES ('boardroom', 'Boardroom', 'Full width navy and gold banner header with a bold serif name, for senior and board level roles.', 'premium', 1, 30, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');
INSERT OR IGNORE INTO templates ("key", "name", "description", "category", "enabled", "sortOrder", "createdAt", "updatedAt") VALUES ('ats-optimized', 'ATS Optimized', 'Single column, plain section headers, and no photos or graphics, built to parse cleanly through applicant tracking systems.', 'premium', 1, 31, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');
