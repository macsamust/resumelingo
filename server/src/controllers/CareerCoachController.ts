import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { SubscriptionTier } from "../types";
import { getProfessionByKey } from "../config/professions";
import { ICareerCoachGenerator, RuleBasedCareerCoachGenerator } from "../services/CareerCoachGenerator";

const MAX_QUESTION_LENGTH = 500;

export class CareerCoachController {
  constructor(private readonly generator: ICareerCoachGenerator = new RuleBasedCareerCoachGenerator()) {}

  ask = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    // Professional and Premium — not tied to any resume, so gated directly
    // on the account's subscription tier, same pattern as
    // ThankYouLetterController.
    if (user.subscriptionTier === SubscriptionTier.Starter) {
      return res
        .status(403)
        .json({ error: "The AI Career Coach is a Professional and Premium feature. Upgrade to use this tool." });
    }

    const { question } = req.body ?? {};
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "A question is required." });
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({ error: `Questions are limited to ${MAX_QUESTION_LENGTH} characters.` });
    }

    const professionLabel = user.profession ? getProfessionByKey(user.profession)?.label ?? user.profession : undefined;
    const result = this.generator.answer(question.trim(), professionLabel, user.profession ?? undefined);
    res.json(result);
  };
}
