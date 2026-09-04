-- Adds the new "Slate" template (dark slate background, decorative
-- accents, two-column grid of white cards) to the D1-backed "templates"
-- table -- see 0021_add_boardroom_ats_templates.sql's rationale for why a
-- row has to exist here in addition to worker/src/config/templates.ts's
-- static array. sortOrder picked above the existing highest known value.
INSERT OR IGNORE INTO templates ("key", "name", "description", "category", "enabled", "sortOrder", "createdAt", "updatedAt") VALUES ('slate', 'Slate', 'Dark slate background with decorative accents behind a two-column grid of floating white cards.', 'premium', 1, 33, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z');
