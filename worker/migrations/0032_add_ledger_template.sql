-- Adds the new "Ledger" template (thick black frame, bold headline name
-- beside a photo, plain rule dividers between sections) to the D1-backed
-- "templates" table -- see 0021_add_boardroom_ats_templates.sql's
-- rationale for why a row has to exist here in addition to
-- worker/src/config/templates.ts's static array. Premium tier, at the
-- person's request (originally scoped as Professional/upgrade, changed
-- before this migration was ever deployed). sortOrder picked above the
-- existing highest known value.
INSERT OR IGNORE INTO templates ("key", "name", "description", "category", "enabled", "sortOrder", "createdAt", "updatedAt") VALUES ('ledger', 'Ledger', 'Thick black frame, bold headline name beside a photo, and plain rule dividers between every section.', 'premium', 1, 34, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z');
