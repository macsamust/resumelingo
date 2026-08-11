-- Phase 4: Stripe billing parity. Adds the two columns server/'s users
-- table already has (see server/src/db/database.ts) so a user's Stripe
-- customer/subscription can be tracked here too — SubscriptionService's
-- checkout/portal/webhook flow (see worker/src/services/SubscriptionService.ts)
-- needs somewhere to persist them, same as Postgres.
ALTER TABLE users ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE users ADD COLUMN "stripeSubscriptionId" TEXT;
