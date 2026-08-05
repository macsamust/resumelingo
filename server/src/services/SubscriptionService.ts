import Stripe from "stripe";
import { UserRepository } from "../repositories/UserRepository";
import { SUBSCRIPTION_PLANS, getPlan } from "../config/subscriptionPlans";
import { SubscriptionTier } from "../types";
import { User } from "../models/User";
import { StripeService } from "./StripeService";

export class SubscriptionService {
  constructor(
    private readonly users: UserRepository = new UserRepository(),
    private readonly stripe: StripeService = new StripeService()
  ) {}

  listPlans() {
    return SUBSCRIPTION_PLANS;
  }

  /**
   * Direct, unbilled tier change. Still used for downgrading to the free
   * Starter tier from the app itself; paid tiers should go through
   * createCheckoutSession instead so the tier only changes once Stripe
   * confirms the subscription (see handleWebhookEvent).
   */
  async changeTier(userId: string, tier: SubscriptionTier): Promise<User> {
    getPlan(tier); // throws if invalid tier
    await this.users.updateSubscriptionTier(userId, tier);
    const record = await this.users.findById(userId);
    return new User(record!);
  }

  async usageFor(user: User) {
    const used = await this.users.countResumesForUser(user.id);
    const limit = user.plan.resumeLimit;
    return {
      tier: user.subscriptionTier,
      planName: user.plan.name,
      resumesUsed: used,
      resumeLimit: limit,
      unlimited: limit === -1,
      remaining: limit === -1 ? null : Math.max(limit - used, 0),
    };
  }

  /** Finds or creates the Stripe Customer for this user and persists its id. */
  private async ensureStripeCustomer(user: User): Promise<string> {
    if (user.stripeCustomerId) return user.stripeCustomerId;
    const customer = await this.stripe.createCustomer({
      email: user.email,
      name: user.name,
      userId: user.id,
    });
    await this.users.setStripeCustomerId(user.id, customer.id);
    return customer.id;
  }

  /**
   * Starts a Stripe Checkout session for upgrading to a paid tier. The tier
   * in our database does NOT change here — only once Stripe confirms the
   * subscription via webhook (handleWebhookEvent) does the user's
   * subscriptionTier actually flip. Returns the URL to redirect the browser to.
   */
  async createCheckoutSession(user: User, tier: SubscriptionTier, origin: string): Promise<string> {
    const plan = getPlan(tier);
    if (!plan.stripePriceId) {
      throw new Error(`"${plan.name}" has no Stripe price configured — check STRIPE_PRICE_* env vars.`);
    }
    const customerId = await this.ensureStripeCustomer(user);
    const session = await this.stripe.createCheckoutSession({
      customerId,
      priceId: plan.stripePriceId,
      userId: user.id,
      successUrl: `${origin}/dashboard?checkout=success`,
      cancelUrl: `${origin}/dashboard?checkout=cancelled`,
    });
    if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
    return session.url;
  }

  /** Opens Stripe's hosted Billing Portal so a user can update payment info, switch plans, or cancel. */
  async createPortalSession(user: User, origin: string): Promise<string> {
    if (!user.stripeCustomerId) {
      throw new Error("No billing account yet — subscribe to a paid plan first.");
    }
    const session = await this.stripe.createPortalSession(user.stripeCustomerId, `${origin}/dashboard`);
    return session.url;
  }

  /**
   * Applies a Stripe subscription's current state to our `users` row. This is
   * the single source of truth for paid tiers — called from the webhook
   * handler for both new subscriptions and portal-driven plan switches, so a
   * user's tier always mirrors what they're actually paying for in Stripe.
   */
  private async syncSubscription(subscription: Stripe.Subscription): Promise<void> {
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const user = await this.users.findByStripeCustomerId(customerId);
    if (!user) return; // webhook for a customer we don't recognize — ignore

    const priceId = subscription.items.data[0]?.price.id;
    const plan = SUBSCRIPTION_PLANS.find((p) => p.stripePriceId === priceId);
    if (!plan) return; // price we don't map to a plan — ignore rather than guess

    const isActive = subscription.status === "active" || subscription.status === "trialing";
    const tier = isActive ? plan.tier : SubscriptionTier.Starter;
    await this.users.applyStripeSubscription(user.id, tier, isActive ? subscription.id : null);
  }

  /** Entry point for the Stripe webhook route. See routes/subscription.routes.ts. */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        // Link the Stripe customer to our user as early as possible. The
        // actual tier change happens below once the subscription events fire
        // (which Stripe sends right alongside this one), so this case mostly
        // exists as a safety net in case ensureStripeCustomer wasn't hit.
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || undefined;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (userId && customerId) {
          const existing = await this.users.findById(userId);
          if (existing && !existing.stripeCustomerId) {
            await this.users.setStripeCustomerId(userId, customerId);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await this.syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break; // ignore event types we don't act on
    }
  }
}
