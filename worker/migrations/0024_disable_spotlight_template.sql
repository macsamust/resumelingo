-- Spotlight was a near-duplicate of Portrait — same layout family
-- (photo-banner-sidebar), same summary-first flow, near-synonym section
-- labels ("Professional Profile"/"Relevant Skills" vs. "Profile"/
-- "Highlights"). Its only real differentiator (Hard Skills/Soft Skills,
-- Workshops & Training) wasn't enough to justify a separate slot in the
-- picker next to a near-identical template. Decision: fold it into Portrait
-- going forward rather than sharpen its own persona.
--
-- `enabled = 0` rather than a DELETE — see TemplateController.ts's
-- `enabled: true` filter, which is the only thing that actually removes it
-- from the picker a subscriber sees (live, no redeploy needed). Anyone
-- already on Spotlight keeps their resume exactly as-is: the "spotlight"
-- style definition stays in client/src/config/templateStyles.ts and
-- worker/src/config/templates.ts's static tier-gating array is untouched,
-- so nothing about an existing Spotlight resume breaks or silently
-- re-renders as some other template. This just stops it being offered to
-- anyone starting fresh.
UPDATE templates
SET enabled = 0,
    updatedAt = '2026-08-30T00:00:00.000Z'
WHERE "key" = 'spotlight';
