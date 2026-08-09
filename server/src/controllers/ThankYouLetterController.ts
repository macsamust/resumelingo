import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { SubscriptionTier } from "../types";
import { getProfessionByKey } from "../config/professions";
import {
  IThankYouLetterGenerator,
  RuleBasedThankYouLetterGenerator,
  THANK_YOU_SCENARIOS,
  ThankYouScenario,
} from "../services/ThankYouLetterGenerator";

const VALID_SCENARIOS = new Set<ThankYouScenario>(THANK_YOU_SCENARIOS.map((s) => s.key));

export class ThankYouLetterController {
  constructor(private readonly generator: IThankYouLetterGenerator = new RuleBasedThankYouLetterGenerator()) {}

  /** GET /api/thank-you-letters/scenarios — feeds the client's dropdown so scenario labels live in one place (this file). */
  scenarios = async (_req: AuthenticatedRequest, res: Response) => {
    res.json({ scenarios: THANK_YOU_SCENARIOS });
  };

  generate = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    // Premium-only, per the feature request — not tied to any resume's
    // template category (this tool isn't attached to a resume at all), so
    // gated directly on the account's subscription tier instead.
    if (user.subscriptionTier !== SubscriptionTier.Premium) {
      return res.status(403).json({ error: "AI thank-you letters are a Premium feature. Upgrade to use this tool." });
    }

    const { company, role, interviewerName, scenario, topic } = req.body ?? {};
    if (!scenario || !VALID_SCENARIOS.has(scenario)) {
      return res.status(400).json({ error: "A valid scenario is required." });
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
    res.json({ letter });
  };
}
