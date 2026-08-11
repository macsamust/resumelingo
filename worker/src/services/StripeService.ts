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

  /** Verifies the `stripe-signature` header against the raw request body. Async — see class doc comment for why. */
  async constructWebhookEvent(rawBody: string, signature: string, webhookSecret: string): Promise<Stripe.Event> {
    return this.requireClient().webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  }
}
