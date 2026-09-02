import Stripe from "stripe";

/**
 * Workers-native counterpart to server/'s StripeService. Two differences
 * from the Node/Express version, both required by the Workers runtime
 * rather than being a design choice:
 *
 * 1. The Stripe SDK client is constructed with `Stripe.createFetchHttpClient()`
 *    (Stripe's own documented integration for Cloudflare Workers) instead of
 *    letting it default to Node's `http` module, which Workers doesn't have.
 * 2. Webhook signature verification uses `constructEventAsync` instead of
 *    `constructEvent` — the sync version depends on Node's `crypto` module
 *    computing an HMAC synchronously, which isn't available the same way in
 *    Workers; the async version uses the standard Web Crypto API
 *    (`SubtleCrypto`) instead, same pattern as TokenService.ts.
 *
 * Unlike server/ (a long-lived Node process that can cache a module-level
 * Stripe client), a Worker has no shared state across isolates/requests, so
 * this is constructed fresh per request in createServices.ts, same as every
 * other service — cheap to do, no connection pooling involved.
 */
export class StripeService {
  private readonly client: Stripe | null;

  constructor(secretKey: string | undefined) {
    this.client = secretKey
      ? new Stripe(secretKey, {
          httpClient: Stripe.createFetchHttpClient(),
        })
      : null;
  }

  private requireClient(): Stripe {
    if (!this.client) {
      throw new Error("STRIPE_SECRET_KEY is not set (see worker/package.json's secret:stripe-key script).");
    }
    return this.client;
  }

  /**
   * Lets callers (currently just SubscriptionController.webhook) tell "Stripe
   * isn't configured at all" apart from "Stripe rejected this specific
   * request" *before* doing anything else — constructWebhookEvent routes
   * through requireClient() too, but that throw was previously only visible
   * inside a catch block shared with actual signature-verification failures,
   * so a missing STRIPE_SECRET_KEY and a genuinely bad/mismatched
   * STRIPE_WEBHOOK_SECRET produced the exact same "Invalid webhook
   * signature" response — indistinguishable from Stripe's dashboard, and a
   * real source of lost time diagnosing which one it actually was.
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  createCustomer(input: { email: string; name: string; userId: string }) {
    return this.requireClient().customers.create({
      email: input.email,
      name: input.name,
      metadata: { userId: input.userId },
    });
  }

  createCheckoutSession(input: {
    customerId: string;
    priceId: string;
    userId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    return this.requireClient().checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      client_reference_id: input.userId,
      subscription_data: { metadata: { userId: input.userId } },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
  }

  createPortalSession(customerId: string, returnUrl: string) {
    return this.requireClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Schedules a subscription to cancel at the end of the current billing
   * period rather than immediately, so the person keeps access through what
   * they already paid for. This is the self-service "Cancel subscription"
   * button on the Profile page — distinct from createPortalSession above,
   * which hands the person off to Stripe's own hosted billing UI.
   */
  cancelSubscription(subscriptionId: string) {
    return this.requireClient().subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  }

  /** Undoes cancelSubscription — clears the scheduled cancellation so the subscription keeps renewing. */
  resumeSubscription(subscriptionId: string) {
    return this.requireClient().subscriptions.update(subscriptionId, { cancel_at_period_end: false });
  }

  /**
   * Verifies the `stripe-signature` header against the raw request body.
   * Async — see class doc comment for why. Takes a *list* of candidate
   * secrets, not one: this single Worker/URL receives webhooks from both
   * Stripe's live-mode and test-mode endpoints (see Env.STRIPE_WEBHOOK_SECRET
   * / STRIPE_WEBHOOK_SECRET_TEST), and Stripe issues each endpoint its own
   * distinct signing secret even though they share a URL. Tries each in
   * turn — a signature only ever matches the one secret that actually
   * signed it, so this is equivalent to knowing up front which mode sent
   * the request, without needing to inspect the payload first. Throws the
   * *last* secret's error if every candidate fails, so the logged error at
   * least reflects a real verification attempt rather than an empty list.
   */
  async constructWebhookEvent(rawBody: string, signature: string, webhookSecrets: string[]): Promise<Stripe.Event> {
    let lastError: unknown;
    for (const secret of webhookSecrets) {
      try {
        return await this.requireClient().webhooks.constructEventAsync(rawBody, signature, secret);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError ?? new Error("No Stripe webhook secret configured.");
  }
}
