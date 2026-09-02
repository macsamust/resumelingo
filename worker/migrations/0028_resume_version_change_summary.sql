-- Lets Version History (Edit Resume) show a short human-readable note on
-- each saved version ("Switched template from Modern to Classic",
-- "Updated Work Experience") so a subscriber can tell versions apart
-- without opening each one — see worker/src/utils/versionChangeSummary.ts
-- and client's VersionHistoryPanel.tsx. Backfilled to '' for any versions
-- saved before this column existed (they'll just show no summary line).
ALTER TABLE resume_versions ADD COLUMN changeSummary TEXT NOT NULL DEFAULT '';
