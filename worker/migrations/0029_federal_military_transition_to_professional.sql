-- Federal and Military Transition move from Premium to Professional
-- ("upgrade" category) tier gating, per CJ's request. Keeps the D1
-- templates table (which backs the public template listing / picker's tier
-- badges) in sync with the static config/templates.ts array, which is what
-- actually enforces the tier gate (see ResumeService.ts's SCOPE NOTE on why
-- gating reads the static config, not this table). Both must reflect the
-- same category, or the picker would show the wrong tier badge for these
-- two templates. Neither template's Skills & Tools section is affected —
-- that's now a per-template list independent of category, see client's
-- utils/templateAccess.ts.
UPDATE templates SET category = 'upgrade', updatedAt = '2026-09-04T00:00:00.000Z' WHERE "key" = 'federal';
UPDATE templates SET category = 'upgrade', updatedAt = '2026-09-04T00:00:00.000Z' WHERE "key" = 'military-transition';
