import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SubscriptionTier } from "../types";
import { getProfessionByKey } from "../config/professions";
import { ICareerCoachGenerator, RuleBasedCareerCoachGenerator } from "../services/CareerCoachGenerator";

const MAX_QUESTION_LENGTH = 500;

/** Hono port of the Node/Express CareerCoachController — same rule-based, no-I/O generator, same Premium gate. */
export class CareerCoachController {
  constructor(private readonly generator: ICareerCoachGenerator = new RuleBasedCareerCoachGenerator()) {}

  ask = async (c: Context<AppEnv>) => {
    const user = c.get("user")!;
    // Premium-only, per the feature request — not tied to any resume, so
    // gated directly on the account's subscription tier, same pattern as
    // ThankYouLetterController.
    if (user.subscriptionTier !== SubscriptionTier.Premium) {
      return c.json({ error: "The AI Career Coach is a Premium feature. Upgrade to use this tool." }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const { question } = body ?? {};
    if (!question || typeof question !== "string" || !question.trim()) {
      return c.json({ error: "A question is required." }, 400);
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return c.json({ error: `Questions are limited to ${MAX_QUESTION_LENGTH} characters.` }, 400);
    }

    const professionLabel = user.profession ? getProfessionByKey(user.profession)?.label ?? user.profession : undefined;
    const result = this.generator.answer(question.trim(), professionLabel, user.profession ?? undefined);
    return c.json(result);
  };
}
