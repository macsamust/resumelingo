import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SubscriptionController } from "../controllers/SubscriptionController";

/**
 * Deliberately separate from subscription.routes.ts, matching server/'s
 * mount at /api/webhooks/stripe (not under /api/subscriptions) — Stripe
 * calls this directly, unauthenticated (the `stripe-signature` header IS
 * the auth, verified in SubscriptionController.webhook), so it must never
 * have requireAuth applied.
 */
const webhooks = new Hono<AppEnv>();
const controller = new SubscriptionController();

webhooks.post("/stripe", controller.webhook);

export default webhooks;
