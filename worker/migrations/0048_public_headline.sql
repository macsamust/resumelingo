-- Separates a resume's public-facing headline (shown under the name on
-- /r/{slug} and in the PDF/print export) from its internal "title" field,
-- which doubles as the label shown on the dashboard's My Resumes list and
-- was never meant to be read by a recruiter (Sep 2026 UX review, UX-07 —
-- an internal QA test title like "Recruiter Access Code QA 0911" was
-- showing as the public headline instead of a role). Null/blank means
-- "fall back to title", so every existing resume's public page renders
-- exactly as it did before this column existed — purely additive, opt-in.
ALTER TABLE resumes ADD COLUMN "headline" TEXT;
