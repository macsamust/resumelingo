-- Optional "Languages" section (see shared's LanguageEntry, client's
-- LanguagesEditor.tsx) — same JSON-array-in-a-TEXT-column pattern as
-- awards/achievements/skillsAndTools (see migration 0002), so it reads and
-- writes through ResumeRepository the same way those do.
ALTER TABLE resumes ADD COLUMN "languages" TEXT NOT NULL DEFAULT '[]';
