import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SubscriptionTier } from "../types";

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

  changeTier = async (c: Context<AppEnv>) => {
    const { subscriptionService } = c.get("services");
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const { tier } = body as Record<string, string>;
    if (!Object.values(SubscriptionTier).includes(tier as SubscriptionTier)) {
      return c.json({ error: "Invalid subscription tier." }, 400);
    }
    const updated = await subscriptionService.changeTier(user.id, tier as SubscriptionTier);
    return c.json({ user: updated.toPublicJSON() });
  };
}
