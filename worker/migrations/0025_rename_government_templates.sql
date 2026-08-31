-- Shortens both "Government"-named templates in the picker so their pills
-- don't wrap to a second line as readily — matches
-- worker/src/config/templates.ts's static name field (a code change alone
-- wouldn't reach the live picker, same reason 0021/0022 needed a migration).
UPDATE templates
SET name = 'Govt',
    updatedAt = '2026-08-30T00:00:00.000Z'
WHERE "key" = 'government';

UPDATE templates
SET name = 'Govt Contractor',
    updatedAt = '2026-08-30T00:00:00.000Z'
WHERE "key" = 'government-contractor';
