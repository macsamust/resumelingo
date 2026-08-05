import Stripe from "stripe";

let cachedClient: Stripe | null = null;

/**
 * Lazily constructs the Stripe SDK client, throwing only when billing is
 * actually used (checkout/portal/webhook) rather than at server boot — so
 * the app still runs locally for anyone who hasn't set up Stripe keys yet.
 */
function getStripeClient(): Stripe {
  if (!cachedClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set (see server/.env.example — get a key from the Stripe Dashboard under Developers > API keys)."
      );
    }
    cachedClient = new Stripe(key);
  }
  return cachedClient;
}

/**
 * Thin wrapper around the Stripe SDK. Everything billing-shaped (creating
 * customers, Checkout Sessions, Billing Portal sessions, verifying webhook
 * signatures) goes through here so SubscriptionService stays focused on
 * "what does this mean for our users table" rather than Stripe API shape.
 */
export class StripeService {
  get client(): Stripe {
    return getStripeClient();
  }

  createCustomer(input: { email: string; name: string; userId: string }) {
    return this.client.customers.create({
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
    return this.client.checkout.sessions.create({
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
    return this.client.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /** Verifies the `stripe-signature` header against the raw request body. */
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set (see server/.env.example).");
    }
    return this.client.webhooks.constructEvent(rawBody, signature, secret);
  }
}
