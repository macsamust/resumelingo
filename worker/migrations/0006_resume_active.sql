-- Adds a dedicated "active" flag, separate from "visibility"/"accessPassword",
-- so a resume's public link can be paused and resumed without touching (or
-- losing) whatever visibility/password setup it already had — see
-- ResumeService.getPublicBySlug and Resume model. Defaults to active (1)
-- so every existing resume keeps working exactly as it does today.
ALTER TABLE resumes ADD COLUMN "active" INTEGER NOT NULL DEFAULT 1;
