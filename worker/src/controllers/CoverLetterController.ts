import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SubscriptionTier } from "../types";
import { pickTopExperience } from "../services/CoverLetterGenerator";

/**
 * The standalone Cover Letter tool (Sep 2026 QA pass — see TODO.md's
 * "Cover Letter parity with Thank-You Letter" entry). Unlike the
 * resume-embedded checkbox (ResumeService.create/update's coverLetterEnabled
 * flow, still unchanged), nothing here is saved and it isn't tied to a
 * resume's template category — same "one-off generator, not persisted"
 * shape as ThankYouLetterController, plus a resumeId so the letter can pull
 * real profession/summary/experience content from an actual resume instead
 * of asking the person to retype all of that by hand.
 */
export class CoverLetterController {
  generate = async (c: Context<AppEnv>) => {
    const { resumeService, coverLetterGenerator } = c.get("services");
    const user = c.get("user")!;

    // Premium-only, matching the Pricing page's "AI cover letters & thank-
    // you letters" line and ThankYouLetterController's identical gate.
    // Deliberately not also requiring a Premium-category template the way
    // the embedded checkbox does — this tool doesn't attach to the resume's
    // rendered output at all, it just borrows the resume's content as
    // source material for a plain text letter.
    if (user.subscriptionTier !== SubscriptionTier.Premium) {
      return c.json({ error: "AI cover letters are a Premium feature. Upgrade to use this tool." }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const { resumeId, companyName, roleName, hiringManagerName } = (body ?? {}) as Record<string, unknown>;
    if (typeof resumeId !== "string" || !resumeId) {
      return c.json({ error: "Choose a resume to base this letter on." }, 400);
    }

    // Throws ResumeNotFoundError/ResumeAccessError for a missing/foreign
    // resumeId — index.ts's onError maps those to 404/403, same as every
    // other controller that calls getOwned.
    const resume = await resumeService.getOwned(user.id, resumeId);

    const letter = await coverLetterGenerator.generate({
      fullName: user.name,
      // roleName lets the person target a specific posting's title (e.g.
      // "Senior Product Manager II") without that overwriting the resume's
      // own title — falls back to the resume's title, same fallback
      // ResumeService.create/update's embedded flow already uses.
      title: typeof roleName === "string" && roleName.trim() ? roleName : resume.title,
      professionLabel: resume.professionLabel,
      summary: resume.generatedSummary,
      topExperience: pickTopExperience(resume.experience),
      companyName: typeof companyName === "string" ? companyName : undefined,
      hiringManagerName: typeof hiringManagerName === "string" ? hiringManagerName : undefined,
    });

    return c.json({ letter });
  };
}
