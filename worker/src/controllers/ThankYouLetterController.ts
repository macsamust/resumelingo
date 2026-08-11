import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SubscriptionTier } from "../types";
import { getProfessionByKey } from "../config/professions";
import {
  IThankYouLetterGenerator,
  RuleBasedThankYouLetterGenerator,
  THANK_YOU_SCENARIOS,
  ThankYouScenario,
} from "../services/ThankYouLetterGenerator";

const VALID_SCENARIOS = new Set<ThankYouScenario>(THANK_YOU_SCENARIOS.map((s) => s.key));

/** Hono port of the Node/Express ThankYouLetterController — same rule-based, no-I/O generator, same Premium gate. */
export class ThankYouLetterController {
  constructor(private readonly generator: IThankYouLetterGenerator = new RuleBasedThankYouLetterGenerator()) {}

  /** GET /api/thank-you-letters/scenarios — feeds the client's dropdown so scenario labels live in one place (this file). */
  scenarios = async (c: Context<AppEnv>) => {
    return c.json({ scenarios: THANK_YOU_SCENARIOS });
  };

  generate = async (c: Context<AppEnv>) => {
    const user = c.get("user")!;
    // Premium-only, per the feature request — not tied to any resume's
    // template category (this tool isn't attached to a resume at all), so
    // gated directly on the account's subscription tier instead.
    if (user.subscriptionTier !== SubscriptionTier.Premium) {
      return c.json({ error: "AI thank-you letters are a Premium feature. Upgrade to use this tool." }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const { company, role, interviewerName, scenario, topic } = body ?? {};
    if (!scenario || !VALID_SCENARIOS.has(scenario)) {
      return c.json({ error: "A valid scenario is required." }, 400);
    }

    const professionLabel = user.profession ? getProfessionByKey(user.profession)?.label ?? user.profession : undefined;
    const letter = this.generator.generate({
      fullName: user.name,
      professionLabel,
      company,
      role,
      interviewerName,
      scenario,
      topic,
    });
    return c.json({ letter });
  };
}
