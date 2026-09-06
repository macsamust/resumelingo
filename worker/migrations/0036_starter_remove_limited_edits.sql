-- Sep 2026 QA pass, ticket S8: Starter's pricing copy claimed "Limited
-- edits" but nothing in the app ever enforced an edit limit — free-tier
-- users could edit as much as anyone else. Rather than build enforcement
-- for a limit that was never real, this drops the phrase from Starter's
-- feature list.
--
-- Conditioned on the row still matching its original 0004_admin_catalog.sql
-- seed value exactly, so this can't silently clobber a feature list an
-- admin has since hand-edited via the Admin Console (PlanRepository /
-- AdminPlanController) — if the row has drifted from the seed, this is a
-- no-op and the phrase needs removing by hand there instead.
UPDATE plans
SET features = '["One resume","Basic template","PDF download","Public link","Basic tips"]'
WHERE tier = 'starter'
  AND features = '["One resume","Basic template","PDF download","Public link","Limited edits","Basic tips"]';
