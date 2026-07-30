import { Response } from "express";
import { SubscriptionService } from "../services/SubscriptionService";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { SubscriptionTier } from "../types";

export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService = new SubscriptionService()) {}

  plans = async (_req: AuthenticatedRequest, res: Response) => {
    res.json({ plans: this.subscriptionService.listPlans() });
  };

  usage = async (req: AuthenticatedRequest, res: Response) => {
    res.json({ usage: this.subscriptionService.usageFor(req.user!) });
  };

  changeTier = async (req: AuthenticatedRequest, res: Response) => {
    const { tier } = req.body ?? {};
    if (!Object.values(SubscriptionTier).includes(tier)) {
      return res.status(400).json({ error: "Invalid subscription tier." });
    }
    const user = this.subscriptionService.changeTier(req.user!.id, tier);
    res.json({ user: user.toPublicJSON() });
  };
}
