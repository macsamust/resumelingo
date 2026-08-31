-- Boardroom's layout family (executive-banner) was already on the ATS-safe
-- allowlist (see client/src/utils/atsCheck.ts's ATS_SAFE_FAMILIES) from the
-- start, so it already passed the live ATS Check without any code change.
-- This just makes that visible: the description now says so explicitly,
-- matching worker/src/config/templates.ts (a code change alone wouldn't
-- reach the live picker either, same reason 0021 needed a migration
-- instead of just editing the static array).
UPDATE templates
SET description = 'Full width navy and gold banner header with a bold serif name, for senior and board level roles. Single column and ATS friendly.',
    updatedAt = '2026-08-30T00:00:00.000Z'
WHERE "key" = 'boardroom';
