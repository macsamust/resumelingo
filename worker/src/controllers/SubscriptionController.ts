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
      return c.json({ error: "Paid tiers must be purchased through checkout, use POST /api/subscriptions/checkout." }, 400);
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

  /** Self-service "Cancel subscription" (Profile page) — cancels at the end of the current billing period, not immediately. */
  cancel = async (c: Context<AppEnv>) => {
    const { subscriptionService } = c.get("services");
    const user = c.get("user")!;
    try {
      const updated = await subscriptionService.cancelSubscription(user);
      return c.json({ user: updated.toPublicJSON() });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Unable to cancel subscription." }, 400);
    }
  };

  /** Undoes a pending cancellation while the current period hasn't ended yet. */
  resume = async (c: Context<AppEnv>) => {
    const { subscriptionService } = c.get("services");
    const user = c.get("user")!;
    try {
      const updated = await subscriptionService.resumeSubscription(user);
      return c.json({ user: updated.toPublicJSON() });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Unable to resume subscription." }, 400);
    }
  };

  /**
   * Stripe webhook receiver. Reads the *raw* request body via `c.req.text()`
   * to verify the `stripe-signature` header — Hono, unlike Express, never
   * globally parses the body ahead of a handler, so there's no equivalent
   * of server/'s express.raw() mount-ordering concern here; the raw bytes
   * are always available.
   */
  webhook = async (c: Context<AppEnv>) => {
    const { subscriptionService, stripeService, stripeWebhookSecrets } = c.get("services");
    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return c.json({ error: "Missing stripe-signature header." }, 400);
    }
    if (stripeWebhookSecrets.length === 0) {
      console.error("Neither STRIPE_WEBHOOK_SECRET nor STRIPE_WEBHOOK_SECRET_TEST is set — rejecting webhook.");
      return c.json({ error: "Webhook not configured." }, 500);
    }
    // Checked separately from (and before) signature verification below —
    // otherwise a missing STRIPE_SECRET_KEY throws from inside
    // constructWebhookEvent's requireClient() call, gets caught by the same
    // catch block as an actual bad signature, and reports the exact same
    // "Invalid webhook signature" error either way. That ambiguity is
    // exactly what made a real incident (STRIPE_WEBHOOK_SECRET mismatched
    // with this endpoint's test-mode signing secret) harder to diagnose from
    // Stripe's dashboard than it needed to be.
    if (!stripeService.isConfigured()) {
      console.error("STRIPE_SECRET_KEY is not set — rejecting webhook.");
      return c.json({ error: "Webhook not configured." }, 500);
    }
    const rawBody = await c.req.text();
    let event;
    try {
      // Tries every configured secret (live-mode first, then test-mode) —
      // see StripeService.constructWebhookEvent and Env.STRIPE_WEBHOOK_SECRET_TEST
      // for why this Worker needs more than one.
      event = await stripeService.constructWebhookEvent(rawBody, signature, stripeWebhookSecrets);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return c.json({ error: "Invalid webhook signature." }, 400);
    }
    await subscriptionService.handleWebhookEvent(event);
    return c.json({ received: true });
  };
}
