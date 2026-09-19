import Stripe from "stripe";
import { UserRepository } from "../repositories/UserRepository";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { getPlan } from "../config/subscriptionPlans";
import { SubscriptionTier } from "../types";
import { User } from "../models/User";
import { StripeService } from "./StripeService";
import { EmailService } from "./EmailService";

/**
 * Template swapped in on a Starter -> Professional upgrade for anyone still
 * on the Basic-tier "starter default" template — see syncSubscription's
 * upgradeStarterTemplate. Classic is the template new resumes start on
 * (ResumeBuilderPage), so a subscriber who never touched it shouldn't be
 * stuck looking like they're still on the free tier the moment they've paid
 * to upgrade. Not applied to any other template — this only replaces the
 * specific "didn't pick one" default, never a template someone chose on purpose.
 */
const STARTER_DEFAULT_TEMPLATE_KEY = "classic";
const UPGRADED_DEFAULT_TEMPLATE_KEY = "consulting";

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
    private readonly premiumPriceId: string | undefined,
    private readonly email: EmailService,
    private readonly clientOrigin: string,
    private readonly resumes: ResumeRepository
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
    return this.createAndPersistStripeCustomer(user);
  }

  /**
   * Creates a brand-new Stripe customer and overwrites whatever
   * `stripeCustomerId` (if any) was already on file. Used both by
   * ensureStripeCustomer (no id yet) and by the stale-customer recovery in
   * createCheckoutSession/createPortalSession below (an id already on file
   * that the currently-configured Stripe mode doesn't recognize — see
   * handleWebhookEvent's mode-gating doc comment for how such an id could
   * get written in the first place).
   */
  private async createAndPersistStripeCustomer(user: User): Promise<string> {
    const customer = await this.stripe.createCustomer({
      email: user.email,
      name: user.name,
      userId: user.id,
    });
    await this.users.setStripeCustomerId(user.id, customer.id);
    return customer.id;
  }

  /**
   * True for the one Stripe error createCheckoutSession/createPortalSession
   * recover from below: a customer id we have on file that this mode of
   * Stripe has never heard of. Distinguishing this from any other Stripe
   * failure matters — retrying by creating a brand-new customer is the right
   * move for "resource_missing" specifically, but would be wrong (and would
   * mask the real problem) for almost anything else Stripe could throw here
   * (a card error, a misconfigured Price id, a genuine API outage).
   *
   * Deliberately does NOT also require `param === "id"` — an earlier version
   * of this check did, copied from a Stripe CLI `customers retrieve` test
   * (where the id is a path parameter literally named "id"), but
   * createPortalSession/createCheckoutSession both pass the customer id as a
   * *body* field named "customer" (`billingPortal.sessions.create({customer:
   * ...})`, `checkout.sessions.create({customer: ...})`), so Stripe reports
   * the invalid param as "customer" there, not "id" — the param-name check
   * silently never matched, which is exactly why the first version of this
   * recovery never fired in production (confirmed live against
   * cus_V6xLF2iezJFsFg, Sep 2026: the account's stripeCustomerId stayed
   * unchanged and the raw Stripe error kept reaching the user after
   * deploying the param==="id" version). The error `code` alone
   * ("resource_missing") is Stripe's stable, documented signal for this
   * case regardless of which param name carried the bad id.
   */
  private isUnknownCustomerError(err: unknown): boolean {
    return err instanceof Stripe.errors.StripeInvalidRequestError && err.code === "resource_missing";
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
      throw new Error(`No Stripe price configured for "${tier}". Check STRIPE_PRICE_* secrets.`);
    }
    const customerId = await this.ensureStripeCustomer(user);
    let session: Stripe.Response<Stripe.Checkout.Session>;
    try {
      session = await this.stripe.createCheckoutSession({
        customerId,
        priceId,
        userId: user.id,
        successUrl: `${origin}/dashboard?checkout=success`,
        cancelUrl: `${origin}/dashboard?checkout=cancelled`,
      });
    } catch (err) {
      if (!this.isUnknownCustomerError(err)) throw err;
      // See createPortalSession's identical recovery below for why this can
      // happen even on an id we just read off the user's own row.
      const freshCustomerId = await this.createAndPersistStripeCustomer(user);
      session = await this.stripe.createCheckoutSession({
        customerId: freshCustomerId,
        priceId,
        userId: user.id,
        successUrl: `${origin}/dashboard?checkout=success`,
        cancelUrl: `${origin}/dashboard?checkout=cancelled`,
      });
    }
    if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
    return session.url;
  }

  /** Opens Stripe's hosted Billing Portal so a user can update payment info, switch plans, or cancel. */
  async createPortalSession(user: User, origin: string): Promise<string> {
    if (!user.stripeCustomerId) {
      throw new Error("No billing account yet. Subscribe to a paid plan first.");
    }
    try {
      const session = await this.stripe.createPortalSession(user.stripeCustomerId, `${origin}/dashboard`);
      return session.url;
    } catch (err) {
      if (!this.isUnknownCustomerError(err)) throw err;
      // The id on file doesn't exist in this Stripe mode. Root cause (found
      // via a QA report on ffox@email.com, Sep 2026): this Worker's one
      // webhook URL accepts both live- and test-mode Stripe events (see
      // StripeService.constructWebhookEvent), and handleWebhookEvent used to
      // act on either regardless of which mode this Worker's own
      // STRIPE_SECRET_KEY is in — so a test-mode checkout could write a
      // test-mode customer id into this same column, which the live API
      // (what this method always calls) then rejects outright. Now guarded
      // against for NEW occurrences by handleWebhookEvent's mode check
      // below; this recovers any account that already has a stale id from
      // before that guard existed, by replacing it with a real customer in
      // the currently-configured mode and retrying once, rather than
      // surfacing Stripe's raw "No such customer" straight to the Manage
      // Billing button.
      const customerId = await this.createAndPersistStripeCustomer(user);
      const session = await this.stripe.createPortalSession(customerId, `${origin}/dashboard`);
      return session.url;
    }
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
    // Mirror Stripe's own cancel_at_period_end/current_period_end so the
    // account reflects a scheduled (not yet effective) cancellation rather
    // than only knowing "active" vs. "gone" — cleared automatically once the
    // subscription actually ends (isActive false) since there's nothing left
    // pending to show.
    const cancelAtPeriodEnd = isActive && subscription.cancel_at_period_end;
    const currentPeriodEnd = isActive && subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    // Captured before the write below, so this reflects the tier the
    // account was actually on going into this webhook — not a naive
    // "isActive" check, since that alone would also fire an email on every
    // one of Stripe's renewal `customer.subscription.updated` events
    // (still active, same tier, nothing the subscriber needs to be told).
    const tierChanged = finalTier !== user.subscriptionTier;

    await this.users.applyStripeSubscription(user.id, finalTier, isActive ? subscription.id : null, cancelAtPeriodEnd, currentPeriodEnd);

    // Only on an actual transition into an active paid tier — covers both
    // a first-time subscribe and a Professional<->Premium change, but not a
    // renewal (still active, same tier) or a cancellation (isActive false,
    // finalTier === Starter — no "you're subscribed" confirmation makes
    // sense there).
    if (isActive && tierChanged) {
      const plan = getPlan(finalTier);
      await this.email.sendSubscriptionConfirmationEmail(user.email, plan.name, `${this.clientOrigin}/dashboard`).catch((err) => {
        console.error("Failed to send subscription confirmation email:", err);
      });
    }

    // Any transition off of Starter (Starter -> Professional or Starter ->
    // Premium, but never Professional -> Premium) — see
    // STARTER_DEFAULT_TEMPLATE_KEY's doc comment above for why only a
    // starting-from-Starter transition swaps a template out from under the
    // subscriber. Must cover Starter -> Premium too: "consulting" is the
    // only template with a Skills & Tools section that a still-on-"classic"
    // subscriber could be on, and without this swap their ATS Check keyword
    // suggestions silently lose their "add" buttons the moment they unlock
    // that feature, with no indication why.
    if (tierChanged && user.subscriptionTier === SubscriptionTier.Starter && finalTier !== SubscriptionTier.Starter) {
      await this.upgradeStarterTemplate(user.id).catch((err) => {
        console.error("Failed to upgrade starter template on Professional upgrade:", err);
      });
    }
  }

  /** Switches every one of this user's resumes still on the Starter-default Classic template to Consulting. Leaves any resume where they picked a different template alone. */
  private async upgradeStarterTemplate(userId: string): Promise<void> {
    const resumes = await this.resumes.findAllForUser(userId);
    for (const resume of resumes) {
      if (resume.templateKey !== STARTER_DEFAULT_TEMPLATE_KEY) continue;
      await this.resumes.update(resume.id, { templateKey: UPGRADED_DEFAULT_TEMPLATE_KEY }, { bumpUpdatedAt: false });
    }
  }

  /**
   * Self-service "Cancel subscription" (Profile page) — schedules
   * cancellation at the end of the current billing period via Stripe rather
   * than cancelling immediately, so the person keeps access through what
   * they already paid for. Updates our own row right away too (see
   * UserRepository.setCancelAtPeriodEnd's doc comment for why that's not
   * redundant with the webhook that follows).
   */
  async cancelSubscription(user: User): Promise<User> {
    if (!user.stripeSubscriptionId) {
      throw new Error("No active subscription to cancel.");
    }
    const subscription = await this.stripe.cancelSubscription(user.stripeSubscriptionId);
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;
    await this.users.setCancelAtPeriodEnd(user.id, true, currentPeriodEnd);
    const record = await this.users.findById(user.id);
    return new User(record!);
  }

  /** Undoes cancelSubscription while the period hasn't ended yet — the subscription keeps renewing as normal. */
  async resumeSubscription(user: User): Promise<User> {
    if (!user.stripeSubscriptionId) {
      throw new Error("No subscription to resume.");
    }
    const subscription = await this.stripe.resumeSubscription(user.stripeSubscriptionId);
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;
    await this.users.setCancelAtPeriodEnd(user.id, false, currentPeriodEnd);
    const record = await this.users.findById(user.id);
    return new User(record!);
  }

  /**
   * Shared by the invoice.payment_failed / invoice.paid cases above — sets
   * or clears `users.paymentFailed` and, only when newly failing (not on
   * every retry, and not on the clearing path), sends a one-off email. Only
   * acts on subscription invoices (skips one-off invoices, if this app ever
   * has any) since `paymentFailed` is specifically about renewal charges.
   */
  private async notifyPaymentFailure(invoice: Stripe.Invoice, failed: boolean): Promise<void> {
    if (!invoice.subscription) return;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;
    const user = await this.users.findByStripeCustomerId(customerId);
    if (!user) return; // webhook for a customer we don't recognize — ignore

    const wasAlreadyFailed = user.paymentFailed;
    await this.users.setPaymentFailed(user.id, failed);

    // Only email on the transition into a failed state — a subsequent
    // failed retry attempt (still failed, was already failed) shouldn't
    // re-send the same email on every one of Stripe's retries.
    if (failed && !wasAlreadyFailed) {
      await this.email.sendPaymentFailedEmail(user.email, `${this.clientOrigin}/dashboard`).catch((err) => {
        // Same "never let an email failure break the actual operation"
        // treatment as everywhere else email is sent from this codebase —
        // the paymentFailed flag (and thus the in-app banner) is already
        // set regardless of whether this send succeeds.
        console.error("Failed to send payment-failed email:", err);
      });
    }
  }

  /**
   * Entry point for the Stripe webhook route. See routes/subscription.routes.ts.
   *
   * Guards against a mode mismatch first: this Worker only ever holds one
   * Stripe secret key (live in production), but StripeService.constructWebhookEvent
   * accepts signatures from BOTH Stripe's live and test webhook secrets at
   * this one URL — a deliberate choice so test traffic doesn't need its own
   * endpoint. Left unchecked, that meant a test-mode checkout/subscription
   * event could still arrive here successfully signed and get acted on as
   * if it were real: `checkout.session.completed` would write a test-mode
   * customer id into `users.stripeCustomerId`, and syncSubscription would
   * apply a test-mode subscription's tier — both columns createPortalSession/
   * createCheckoutSession then read and hand to the LIVE Stripe API, which
   * rejects a test-mode id outright ("No such customer"). Found via a QA
   * report on ffox@email.com (Sep 2026) whose Manage Billing button failed
   * exactly that way; see createPortalSession's stale-customer recovery for
   * the fix on the read side, and this check for closing the write side.
   * Ignoring (not throwing on) a mismatched event still acks the webhook
   * with 200 so Stripe doesn't retry it forever — it just never gets acted on.
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    if (event.livemode !== this.stripe.isLiveMode()) {
      console.warn(
        `Ignoring Stripe webhook event ${event.id} (${event.type}): event.livemode=${event.livemode} but this Worker is configured for ${
          this.stripe.isLiveMode() ? "live" : "test"
        } mode.`
      );
      return;
    }
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
      // Fires when a subscription renewal charge fails. Stripe retries on
      // its own schedule (Smart Retries) and eventually fires
      // customer.subscription.deleted if every retry fails — that already
      // flips the user back to Starter with no extra work needed here. This
      // case exists purely so the subscriber finds out *during* the retry
      // window instead of only once access is actually cut off.
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await this.notifyPaymentFailure(invoice, true);
        break;
      }
      // Clears the flag set above once a charge succeeds again — covers
      // both "the retry worked" and "an unrelated later invoice succeeded,"
      // either way there's no longer a failure to warn about.
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await this.notifyPaymentFailure(invoice, false);
        break;
      }
      default:
        break; // ignore event types we don't act on
    }
  }
}
