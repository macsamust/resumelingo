-- Basic event log for the "Full Circle" post-publish coach (see migration
-- 0045's header and CareerLoopService.ts). Added after shipping the coach's
-- UI without any way to tell whether it's actually being noticed — before
-- turning CAREER_LOOP_ENABLED on for real, this table is what answers "is
-- anyone even opening the badge" rather than guessing from silence.
--
-- One row per interaction, not aggregated — deliberately simple (no rollup
-- table, no admin dashboard yet) since the immediate need is just "can we
-- see usage at all," answerable with a raw SELECT against this table (e.g.
-- `SELECT "eventType", COUNT(*) FROM career_loop_events GROUP BY 1`) via
-- `wrangler d1 execute`. A proper aggregated dashboard panel can follow once
-- there's actually data worth visualizing.
--
-- "eventType" is one of: "shown" (badge popover or the post-publish modal
-- was opened/displayed), "cta_click" (a step's action button/link was
-- clicked — "step" names which one), "step_done" (Share/Track/Letters
-- actually got marked complete — logged server-side inside
-- CareerLoopService, not client-triggered, so it can never drift from the
-- real progress row), "completed" (all four steps done, logged once at the
-- same moment the "full circle" toast fires). "step" is null for "shown"
-- and "completed" (whole-loop events, not tied to one step) and one of
-- "share"/"track"/"letters" for "cta_click"/"step_done".
CREATE TABLE IF NOT EXISTS career_loop_events (
  "id" TEXT PRIMARY KEY,
  "resumeId" TEXT NOT NULL REFERENCES resumes("id"),
  "userId" TEXT NOT NULL REFERENCES users("id"),
  "eventType" TEXT NOT NULL,
  "step" TEXT,
  "createdAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS career_loop_events_resume_idx ON career_loop_events("resumeId");
CREATE INDEX IF NOT EXISTS career_loop_events_type_idx ON career_loop_events("eventType");
