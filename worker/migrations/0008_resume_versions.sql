-- Resume version history — a lighter, automatic companion to Clone's manual
-- "save a copy" (see ResumeRepository.clone). "snapshot" is a
-- JSON-serialized ResumeVersionSnapshot (content fields only — fullName,
-- title, profession, templateKey, answers, experience, education, awards,
-- achievements, skillsAndTools, generatedSummary/Bullets/CoverLetter,
-- coverLetterEnabled, combineExperienceFormat, references,
-- referencesEnabled, referencesRecruiterModeOnly — deliberately NOT
-- visibility/accessPassword/active, since a version is about what the
-- resume says, not how its link is currently shared). See
-- ResumeVersionRepository.snapshot, which also caps history at the most
-- recent 20 rows per resume, pruning older ones on write.
CREATE TABLE resume_versions (
  "id" TEXT PRIMARY KEY,
  "resumeId" TEXT NOT NULL REFERENCES resumes("id"),
  "snapshot" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);
CREATE INDEX resume_versions_resume_idx ON resume_versions ("resumeId");
CREATE INDEX resume_versions_created_at_idx ON resume_versions ("resumeId", "createdAt");
