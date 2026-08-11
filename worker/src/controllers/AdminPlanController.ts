import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SubscriptionTier } from "../types";

export class AdminPlanController {
  list = async (c: Context<AppEnv>) => {
    const { planRepository } = c.get("services");
    const records = await planRepository.findAll();
    return c.json({
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

  update = async (c: Context<AppEnv>) => {
    const { planRepository } = c.get("services");
    const tier = c.req.param("tier")! as SubscriptionTier;
    if (!Object.values(SubscriptionTier).includes(tier)) {
      return c.json({ error: "Invalid subscription tier." }, 400);
    }
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { name, priceMonthly, resumeLimit, features } = body;
    if (priceMonthly !== undefined && (typeof priceMonthly !== "number" || priceMonthly < 0)) {
      return c.json({ error: "priceMonthly must be a non-negative number." }, 400);
    }
    if (resumeLimit !== undefined && (typeof resumeLimit !== "number" || resumeLimit < -1)) {
      return c.json({ error: "resumeLimit must be -1 (unlimited) or a non-negative number." }, 400);
    }
    const updated = await planRepository.update(tier, {
      name: name as string | undefined,
      priceMonthly: priceMonthly as number | undefined,
      resumeLimit: resumeLimit as number | undefined,
      features: features as string[] | undefined,
    });
    if (!updated) return c.json({ error: "Plan not found." }, 404);
    return c.json({
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
