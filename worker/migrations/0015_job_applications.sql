-- Job application tracker — ties which resume (version) was sent where, and
-- what happened after. Net-new domain model, not an extension of Resume;
-- see TODO.md's "Product review" note. "resumeId" is nullable and NOT
-- cascade-deleted when the resume itself is deleted (see
-- ResumeRepository.delete/deleteBulk/deleteAllForUser, which now NULL it out
-- instead) — losing your application history just because you deleted an
-- old resume would be a bad surprise, so the application row survives with
-- resumeId cleared.
CREATE TABLE job_applications (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users("id"),
  "resumeId" TEXT REFERENCES resumes("id"),
  "company" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  -- One of "applied" | "interviewing" | "offer" | "rejected" | "withdrawn" —
  -- see shared/src/index.ts's JobApplicationStatus.
  "status" TEXT NOT NULL DEFAULT 'applied',
  -- ISO date (yyyy-mm-dd) the application went out, or NULL if not set.
  "appliedDate" TEXT,
  "link" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);
CREATE INDEX job_applications_user_idx ON job_applications ("userId");
CREATE INDEX job_applications_resume_idx ON job_applications ("resumeId");
