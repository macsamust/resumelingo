-- Backs the "Full Circle" post-publish coach (Sep 2026): a 4-step nudge
-- (Resume -> Share -> Track -> Letters) shown after a subscriber's first
-- resume publish, then as an ongoing dashboard card until complete or
-- dismissed. See docs/full-circle-coach-build-brief.md for the full spec.
--
-- Resume-scoped, not user-scoped, since a person can have multiple resumes
-- and the loop is "did *this* resume make it out the door" rather than a
-- single account-wide flag.
--
-- Only Share and Letters get their own stored timestamp here — Resume is
-- implicitly true whenever a row can be queried at all (a loop only starts
-- once a resume has been created and published), and Track is deliberately
-- NOT stored here: it is computed live from job_applications ("does at
-- least one application row for this resumeId exist"), so the tracker and
-- the coach can never drift out of sync with each other.
CREATE TABLE IF NOT EXISTS career_loop_progress (
  "resumeId" TEXT PRIMARY KEY REFERENCES resumes("id"),
  "userId" TEXT NOT NULL REFERENCES users("id"),
  "sharedAt" TEXT,
  "lettersAt" TEXT,
  -- Set when the user hits "Skip for now" or dismisses the dashboard card.
  -- dismissedUntil implements the "resume your loop" 7-day snooze from the
  -- build brief — after it passes, the card is eligible to show again.
  "dismissedAt" TEXT,
  "dismissedUntil" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS career_loop_progress_user_idx ON career_loop_progress("userId");
