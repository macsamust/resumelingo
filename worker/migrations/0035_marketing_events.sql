-- Lightweight, durable marketing/funnel event log (Sep 2026 QA pass — see
-- TODO.md's "Pricing CTAs preserve plan intent" entry). No analytics vendor
-- (GA, Plausible, etc.) is wired into this app anywhere, so rather than
-- bolt one on for a single event, this reuses the same "small D1 table,
-- one row per event, queryable later" shape security_events (migration
-- 0034) already established — no new infra/vendor, and it's a real,
-- queryable record rather than a black box. Generic name and shape (not
-- "plan_click_events"), since plan_clicked is unlikely to be the only
-- event worth logging this way going forward.
CREATE TABLE IF NOT EXISTS marketing_events (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  detail TEXT,
  "createdAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_events_event_createdAt ON marketing_events(event, "createdAt");
