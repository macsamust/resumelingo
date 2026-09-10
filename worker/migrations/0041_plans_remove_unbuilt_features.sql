-- Sep 2026 marketing-docs consistency audit: the live plans data (seeded
-- by 0004_admin_catalog.sql) claimed Premium included "Custom domain" and
-- "Portfolio pages & personal branding tools" -- neither was ever built
-- (no custom-domain support anywhere in the codebase; portfolio pages are
-- an explicitly shelved future idea, see FuturePremium.tsx). Paying
-- Premium subscribers were seeing these on the real Pricing page. Swapped
-- for two features that actually exist today but were missing from this
-- row: the branded resumelingo.com/r/name-title link
-- (ResumeRepository.generateBrandedSlug, Premium only) and the AI Career
-- Coach (CareerCoachPage.tsx, Premium only).
--
-- Also adds "Application Tracker" to Professional's list -- a real,
-- shipped feature (JobApplicationsPage.tsx) that was present in the old
-- static worker/src/config/subscriptionPlans.ts reference array but never
-- made it into this table's seed row.
--
-- Both UPDATEs are conditioned on the row still matching its exact
-- original 0004_admin_catalog.sql seed value, so this can't silently
-- clobber a feature list an admin has since hand-edited via the Admin
-- Console (PlanRepository / AdminPlanController) -- if a row has drifted,
-- this is a no-op and it needs fixing by hand there instead.
UPDATE plans
SET features = '["Three resumes","Unlimited edits","Template library","Private sharing","Analytics","Resume scoring","Career Center","AI assistance","Application Tracker"]'
WHERE tier = 'professional'
  AND features = '["Three resumes","Unlimited edits","Template library","Private sharing","Analytics","Resume scoring","Career Center","AI assistance"]';

UPDATE plans
SET features = '["Everything in Professional","Unlimited resumes","Premium templates","Branded resume link","Resume analytics","Interview preparation","Career coaching resources","ATS optimization","AI cover letters & thank-you letters","AI Career Coach"]'
WHERE tier = 'premium'
  AND features = '["Everything in Professional","Unlimited resumes","Premium templates","Custom domain","Resume analytics","Interview preparation","Career coaching resources","ATS optimization","AI cover letters & thank-you letters","Portfolio pages & personal branding tools"]';
