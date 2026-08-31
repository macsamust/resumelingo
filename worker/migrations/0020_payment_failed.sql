-- Tracks a failed subscription renewal charge so the app can warn the
-- subscriber in-app and by email during Stripe's retry window, instead of
-- silently doing nothing until the subscription eventually gets cancelled
-- (customer.subscription.deleted). See SubscriptionService.handleWebhookEvent's
-- "invoice.payment_failed" / "invoice.paid" cases.
ALTER TABLE users ADD COLUMN "paymentFailed" INTEGER NOT NULL DEFAULT 0;
