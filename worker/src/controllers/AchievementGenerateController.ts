import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SubscriptionTier } from "../types";

const MAX_KEYWORDS_LENGTH = 1000;

/** POST /api/achievement-generate — see services/AchievementGeneratorService.ts. Professional/Premium-gated, same tier as Resume Import (the closest existing AI-assist feature). */
export class AchievementGenerateController {
  generate = async (c: Context<AppEnv>) => {
    const user = c.get("user")!;
    if (user.subscriptionTier !== SubscriptionTier.Professional && user.subscriptionTier !== SubscriptionTier.Premium) {
      return c.json({ error: "Generating achievements requires the Professional or Premium plan. Upgrade to use this tool." }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const { professionLabel, jobTitle, keywords } = (body ?? {}) as {
      professionLabel?: unknown;
      jobTitle?: unknown;
      keywords?: unknown;
    };
    if (typeof keywords !== "string" || !keywords.trim()) {
      return c.json({ error: "Add a few keywords first — nothing to generate from." }, 400);
    }
    if (keywords.length > MAX_KEYWORDS_LENGTH) {
      return c.json({ error: `That's too long (limit is ${MAX_KEYWORDS_LENGTH.toLocaleString()} characters) — try trimming it down to a shorter list.` }, 400);
    }

    const { achievementGeneratorService } = c.get("services");
    const achievements = await achievementGeneratorService.generate({
      professionLabel: typeof professionLabel === "string" ? professionLabel : "",
      jobTitle: typeof jobTitle === "string" ? jobTitle : undefined,
      keywords,
    });
    return c.json({ achievements });
  };
}
