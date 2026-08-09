import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { ResumeService } from "../services/ResumeService";
import { SubscriptionService } from "../services/SubscriptionService";
import { Resume } from "../models/Resume";

export class DashboardController {
  constructor(
    private readonly resumeService: ResumeService = new ResumeService(),
    private readonly subscriptionService: SubscriptionService = new SubscriptionService()
  ) {}

  summary = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const resumes = await this.resumeService.listForUser(user.id);
    const usage = await this.subscriptionService.usageFor(user);

    res.json({
      myResumes: resumes.map((r) => r.toJSON()),
      sharedLinks: resumes.map((r) => ({ title: r.title, slug: r.slug, visibility: r.visibility })),
      resumeViews: resumes.reduce((sum, r) => sum + r.viewCount, 0),
      profileStrengthScore: this.averageStrengthScore(resumes),
      suggestedImprovements: this.suggestImprovements(resumes),
      subscription: usage,
    });
  };

  // Per-resume score now lives on the model (Resume.strengthScore) so it's
  // computed in one place and exposed on every resume's toJSON() too (see
  // Premium dashboard's Resume Analytics table). This just averages it.
  private averageStrengthScore(resumes: Resume[]): number {
    if (resumes.length === 0) return 0;
    const total = resumes.reduce((sum, r) => sum + r.strengthScore, 0);
    return Math.round(total / resumes.length);
  }

  private suggestImprovements(resumes: Resume[]): string[] {
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
}
