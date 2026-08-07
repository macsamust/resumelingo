import { Response } from "express";
import { PlanRepository } from "../repositories/PlanRepository";
import { AdminAuthenticatedRequest } from "../middleware/adminAuthMiddleware";
import { SubscriptionTier } from "../types";

export class AdminPlanController {
  constructor(private readonly plans: PlanRepository = new PlanRepository()) {}

  list = async (_req: AdminAuthenticatedRequest, res: Response) => {
    const records = await this.plans.findAll();
    res.json({
      plans: records.map((r) => ({
        tier: r.tier,
        name: r.name,
        priceMonthly: r.priceMonthly,
        resumeLimit: r.resumeLimit,
        features: JSON.parse(r.features || "[]"),
        updatedAt: r.updatedAt,
      })),
    });
  };

  update = async (req: AdminAuthenticatedRequest, res: Response) => {
    const tier = req.params.tier as SubscriptionTier;
    if (!Object.values(SubscriptionTier).includes(tier)) {
      return res.status(400).json({ error: "Invalid subscription tier." });
    }
    const { name, priceMonthly, resumeLimit, features } = req.body ?? {};
    if (priceMonthly !== undefined && (typeof priceMonthly !== "number" || priceMonthly < 0)) {
      return res.status(400).json({ error: "priceMonthly must be a non-negative number." });
    }
    if (resumeLimit !== undefined && (typeof resumeLimit !== "number" || (resumeLimit < -1))) {
      return res.status(400).json({ error: "resumeLimit must be -1 (unlimited) or a non-negative number." });
    }
    const updated = await this.plans.update(tier, { name, priceMonthly, resumeLimit, features });
    if (!updated) return res.status(404).json({ error: "Plan not found." });
    res.json({
      plan: {
        tier: updated.tier,
        name: updated.name,
        priceMonthly: updated.priceMonthly,
        resumeLimit: updated.resumeLimit,
        features: JSON.parse(updated.features || "[]"),
        updatedAt: updated.updatedAt,
      },
    });
  };
}
