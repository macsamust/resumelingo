import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SubscriptionTier } from "../types";

export class SubscriptionController {
  plans = async (c: Context<AppEnv>) => {
    const { subscriptionService } = c.get("services");
    return c.json({ plans: subscriptionService.listPlans() });
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
