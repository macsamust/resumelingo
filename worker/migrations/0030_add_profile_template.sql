-- Adds the new "Profile" template (oversized name/dotted photo header over a
-- two-column Experience/Education list) to the D1-backed "templates" table
-- — see 0021_add_boardroom_ats_templates.sql's rationale for why a row has
-- to exist here in addition to worker/src/config/templates.ts's static
-- array. sortOrder picked above the existing highest known value.
INSERT OR IGNORE INTO templates ("key", "name", "description", "category", "enabled", "sortOrder", "createdAt", "updatedAt") VALUES ('profile', 'Profile', 'Oversized name and a dotted photo header, over a clean two-column Experience and Education list.', 'premium', 1, 32, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z');
