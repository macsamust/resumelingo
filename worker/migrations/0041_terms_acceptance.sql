-- Records explicit Terms of Service acceptance at signup (previously only
-- implied by a footnote link on the signup form — see SignupPage.tsx).
-- Both null for every account that predates this migration (Sep 2026),
-- same grandfathering approach as migration 0017's emailVerified backfill:
-- there's no honest acceptance timestamp to backfill for those accounts,
-- so they're left null rather than stamped with a fabricated date.
ALTER TABLE users ADD COLUMN "termsAcceptedAt" TEXT;
ALTER TABLE users ADD COLUMN "termsVersion" TEXT;
