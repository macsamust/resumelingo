import { Request, Response } from "express";
import { SubscriptionService } from "../services/SubscriptionService";
import { StripeService } from "../services/StripeService";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { SubscriptionTier } from "../types";

/** Where to send the browser back to after Checkout / the Billing Portal. */
function clientOrigin(): string {
  return process.env.CLIENT_ORIGIN || "http://localhost:5173";
}

export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService = new SubscriptionService(),
    private readonly stripeService: StripeService = new StripeService()
  ) {}

  plans = async (_req: AuthenticatedRequest, res: Response) => {
    res.json({ plans: this.subscriptionService.listPlans() });
  };

  usage = async (req: AuthenticatedRequest, res: Response) => {
    res.json({ usage: await this.subscriptionService.usageFor(req.user!) });
  };

  /** Manual/free tier change — used for downgrading to Starter. Paid tiers go through checkout. */
  changeTier = async (req: AuthenticatedRequest, res: Response) => {
    const { tier } = req.body ?? {};
    if (!Object.values(SubscriptionTier).includes(tier)) {
      return res.status(400).json({ error: "Invalid subscription tier." });
    }
    if (tier !== SubscriptionTier.Starter) {
      return res.status(400).json({
        error: "Paid tiers must be purchased through checkout — use POST /api/subscriptions/checkout.",
      });
    }
    const user = await this.subscriptionService.changeTier(req.user!.id, tier);
    res.json({ user: user.toPublicJSON() });
  };

  /** Creates a Stripe Checkout session for upgrading to Professional or Premium. */
  checkout = async (req: AuthenticatedRequest, res: Response) => {
    const { tier } = req.body ?? {};
    if (tier !== SubscriptionTier.Professional && tier !== SubscriptionTier.Premium) {
      return res.status(400).json({ error: "tier must be \"professional\" or \"premium\"." });
    }
    const url = await this.subscriptionService.createCheckoutSession(req.user!, tier, clientOrigin());
    res.json({ url });
  };

  /** Opens Stripe's hosted Billing Portal (update card, switch plan, cancel). */
  portal = async (req: AuthenticatedRequest, res: Response) => {
    const url = await this.subscriptionService.createPortalSession(req.user!, clientOrigin());
    res.json({ url });
  };

  /**
   * Stripe webhook receiver. Must see the *raw* request body (not the
   * express.json()-parsed one) to verify the `stripe-signature` header — see
   * the express.raw() mount for this route in app.ts, which runs before the
   * global express.json() middleware.
   */
  webhook = async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") {
      return res.status(400).json({ error: "Missing stripe-signature header." });
    }
    let event;
    try {
      event = this.stripeService.constructWebhookEvent(req.body as Buffer, signature);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return res.status(400).json({ error: "Invalid webhook signature." });
    }
    await this.subscriptionService.handleWebhookEvent(event);
    res.json({ received: true });
  };
}
