-- "Certifications & Training" section (see shared's CertificationEntry,
-- client's CertificationsEditor.tsx) — same JSON-array-in-a-TEXT-column
-- pattern as languages/awards (migrations 0002, 0010). Replaces the old
-- "Certifications" Additional Details answer: rows saved before this keep
-- that answer in their `answers` JSON, and the Resume model converts it into
-- entries on read when this column is still empty (see models/Resume.ts), so
-- no data migration is needed here.
ALTER TABLE resumes ADD COLUMN "certifications" TEXT NOT NULL DEFAULT '[]';
