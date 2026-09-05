-- Status change timeline for the Job Applications tracker — see
-- JobApplicationRepository/Service. Previously "status" was a single
-- mutable column on job_applications, so moving Applied -> Interviewing ->
-- Rejected silently discarded the earlier stages. This table records one
-- row per status change going forward, including an application's initial
-- status at the moment it's created (JobApplicationService.create() —
-- that's real data, not a backfill). What's deliberately NOT done is
-- inventing a history row for an application that already existed before
-- this migration shipped — its true original status (if it's since
-- changed) is genuinely unknown, so the client falls back to that row's own
-- "createdAt" + current "status" as a best-effort first entry instead.
--
-- No ON DELETE CASCADE — see migration 0007's note: D1 does enforce foreign
-- keys, so deleting a job_applications row with history rows still
-- referencing it fails unless those rows are deleted first. That cleanup is
-- handled in application code instead — see JobApplicationRepository.delete()
-- /deleteBulk(), which delete from this table before deleting the
-- job_applications row itself.
CREATE TABLE job_application_status_history (
  "id" TEXT PRIMARY KEY,
  "jobApplicationId" TEXT NOT NULL REFERENCES job_applications("id"),
  -- One of "applied" | "interviewing" | "offer" | "rejected" | "withdrawn" —
  -- same JobApplicationStatus union as job_applications.status.
  "status" TEXT NOT NULL,
  "changedAt" TEXT NOT NULL
);
CREATE INDEX job_application_status_history_app_idx ON job_application_status_history ("jobApplicationId");
