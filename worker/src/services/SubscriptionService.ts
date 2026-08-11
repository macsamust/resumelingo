import Stripe from "stripe";
import { UserRepository } from "../repositories/UserRepository";
import { getPlan } from "../config/subscriptionPlans";
import { SubscriptionTier } from "../types";
import { User } from "../models/User";
import { StripeService } from "./StripeService";

/**
 * Same responsibilities as the Node/Express SubscriptionService. One
 * deviation: getPlan()'s static config/subscriptionPlans.ts array has no
 * `stripePriceId` (unlike server/'s, which merges it in from env vars at
 * module load — see that file's stripePriceIdFor()), because a Worker has
 * no long-lived process to merge env into a shared cache at boot. Instead,
 * the two Stripe Price IDs are passed into this constructor directly (from
 * this request's env — see createServices.ts) and matched to a tier here.
 */
export class SubscriptionService {
  constructor(
    private readonly users: UserRepository,
    private readonly stripe: StripeService,
    private readonly professionalPriceId: string | undefined,
    private readonly premiumPriceId: string | undefined
  ) {}

  private priceIdFor(tier: SubscriptionTier): string | undefined {
    if (tier === SubscriptionTier.Professional) return this.professionalPriceId;
    if (tier === SubscriptionTier.Premium) return this.premiumPriceId;
    return undefined;
  }

  private planForPriceId(priceId: string): SubscriptionTier | undefined {
    if (priceId === this.professionalPriceId) return SubscriptionTier.Professional;
    if (priceId === this.premiumPriceId) return SubscriptionTier.Premium;
    return undefined;
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
    getPlan(tier); // throws if invalid tier
    const priceId = this.priceIdFor(tier);
    if (!priceId) {
      throw new Error(`No Stripe price configured for "${tier}" — check STRIPE_PRICE_* secrets.`);
    }
    const customerId = await this.ensureStripeCustomer(user);
    const session = await this.stripe.createCheckoutSession({
      customerId,
      priceId,
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
    const tier = priceId ? this.planForPriceId(priceId) : undefined;
    if (!tier) return; // price we don't map to a plan — ignore rather than guess

    const isActive = subscription.status === "active" || subscription.status === "trialing";
    const finalTier = isActive ? tier : SubscriptionTier.Starter;
    await this.users.applyStripeSubscription(user.id, finalTier, isActive ? subscription.id : null);
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
