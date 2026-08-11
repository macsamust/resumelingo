import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { Resume } from "../models/Resume";

/**
 * Same responsibilities as the Node/Express DashboardController's
 * myResumes/sharedLinks/resumeViews/profileStrengthScore/
 * suggestedImprovements/subscription fields. `resumeAnalytics` is always
 * null here — server/'s Premium-only "Resume Analytics" section
 * (strengthDistribution, sectionGaps, staleResumes, viewTrend, scoreTrend,
 * recurringMissingKeywords, comparison) is built from three analytics-only
 * tables (resume_views, resume_score_snapshots, resume_keyword_checks) that
 * are a bigger scope item than this pass — see the note in
 * worker/src/services/ResumeService.ts. The key is still included so the
 * client (which reads it defensively) doesn't need special-casing for
 * Premium accounts on the Worker deployment.
 */
export class DashboardController {
  summary = async (c: Context<AppEnv>) => {
    const { resumeService, subscriptionService } = c.get("services");
    const user = c.get("user")!;
    const resumes = await resumeService.listForUser(user.id);
    const usage = await subscriptionService.usageFor(user);

    return c.json({
      myResumes: resumes.map((r) => r.toJSON()),
      sharedLinks: resumes.map((r) => ({ title: r.title, slug: r.slug, visibility: r.visibility })),
      resumeViews: resumes.reduce((sum, r) => sum + r.viewCount, 0),
      profileStrengthScore: averageStrengthScore(resumes),
      suggestedImprovements: suggestImprovements(resumes),
      resumeAnalytics: null,
      subscription: usage,
    });
  };
}

// Per-resume score lives on the model (Resume.strengthScore); this just averages it.
function averageStrengthScore(resumes: Resume[]): number {
  if (resumes.length === 0) return 0;
  const total = resumes.reduce((sum, r) => sum + r.strengthScore, 0);
  return Math.round(total / resumes.length);
}

function suggestImprovements(resumes: Resume[]): string[] {
  if (resumes.length === 0) {
    return ["Create your first resume to get a Profile Strength Score."];
  }
  const suggestions = new Set<string>();
  for (const resume of resumes) {
    const answered = Object.values(resume.answers).filter((v) => v && v.trim()).length;
    if (answered < 4) suggestions.add("Answer more interview questions to strengthen your summary.");
    if (resume.generatedBullets.length < 3) suggestions.add("Add more achievements to generate additional bullets.");
    if (!resume.answers["certifications"]) suggestions.add("Add certifications relevant to your field.");
  }
  if (suggestions.size === 0) suggestions.add("Your resumes look strong — check the Career Center for interview prep.");
  return Array.from(suggestions);
}
