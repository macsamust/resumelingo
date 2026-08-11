import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SubscriptionTier } from "../types";

/** Where to send the browser back to after Checkout / the Billing Portal. */
function clientOrigin(c: Context<AppEnv>): string {
  return c.env.CLIENT_ORIGIN || "http://localhost:5173";
}

export class SubscriptionController {
  /**
   * Now D1-backed via PlanRepository (see migrations/0004_admin_catalog.sql)
   * instead of subscriptionService.listPlans()'s static config/subscriptionPlans.ts
   * array, so admin edits (see AdminPlanController) show up immediately.
   * Internal tier-limit/gating logic (SubscriptionService.usageFor/changeTier,
   * ResumeService's template/visibility gates) still reads the static
   * config for policy decisions — only this display endpoint moved.
   */
  plans = async (c: Context<AppEnv>) => {
    const { planRepository } = c.get("services");
    const records = await planRepository.findAll();
    return c.json({
      plans: records.map((r) => ({
        tier: r.tier,
        name: r.name,
        priceMonthly: r.priceMonthly,
        resumeLimit: r.resumeLimit,
        features: JSON.parse(r.features || "[]"),
      })),
    });
  };

  usage = async (c: Context<AppEnv>) => {
    const { subscriptionService } = c.get("services");
    const user = c.get("user")!;
    return c.json({ usage: await subscriptionService.usageFor(user) });
  };

  /** Manual/free tier change — used for downgrading to Starter. Paid tiers go through checkout. */
  changeTier = async (c: Context<AppEnv>) => {
    const { subscriptionService } = c.get("services");
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const { tier } = body as Record<string, string>;
    if (!Object.values(SubscriptionTier).includes(tier as SubscriptionTier)) {
      return c.json({ error: "Invalid subscription tier." }, 400);
    }
    if (tier !== SubscriptionTier.Starter) {
      return c.json({ error: "Paid tiers must be purchased through checkout — use POST /api/subscriptions/checkout." }, 400);
    }
    const updated = await subscriptionService.changeTier(user.id, tier as SubscriptionTier);
    return c.json({ user: updated.toPublicJSON() });
  };

  /** Creates a Stripe Checkout session for upgrading to Professional or Premium. */
  checkout = async (c: Context<AppEnv>) => {
    const { subscriptionService } = c.get("services");
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const { tier } = body as Record<string, string>;
    if (tier !== SubscriptionTier.Professional && tier !== SubscriptionTier.Premium) {
      return c.json({ error: 'tier must be "professional" or "premium".' }, 400);
    }
    const url = await subscriptionService.createCheckoutSession(user, tier as SubscriptionTier, clientOrigin(c));
    return c.json({ url });
  };

  /** Opens Stripe's hosted Billing Portal (update card, switch plan, cancel). */
  portal = async (c: Context<AppEnv>) => {
    const { subscriptionService } = c.get("services");
    const user = c.get("user")!;
    const url = await subscriptionService.createPortalSession(user, clientOrigin(c));
    return c.json({ url });
  };

  /**
   * Stripe webhook receiver. Reads the *raw* request body via `c.req.text()`
   * to verify the `stripe-signature` header — Hono, unlike Express, never
   * globally parses the body ahead of a handler, so there's no equivalent
   * of server/'s express.raw() mount-ordering concern here; the raw bytes
   * are always available.
   */
  webhook = async (c: Context<AppEnv>) => {
    const { subscriptionService, stripeService, stripeWebhookSecret } = c.get("services");
    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return c.json({ error: "Missing stripe-signature header." }, 400);
    }
    if (!stripeWebhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not set — rejecting webhook.");
      return c.json({ error: "Webhook not configured." }, 500);
    }
    const rawBody = await c.req.text();
    let event;
    try {
      event = await stripeService.constructWebhookEvent(rawBody, signature, stripeWebhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return c.json({ error: "Invalid webhook signature." }, 400);
    }
    await subscriptionService.handleWebhookEvent(event);
    return c.json({ received: true });
  };
}
