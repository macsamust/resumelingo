import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { ResumeService } from "../services/ResumeService";
import { SubscriptionService } from "../services/SubscriptionService";
import { KeywordGapCount, ResumeAnalyticsRepository } from "../repositories/ResumeAnalyticsRepository";
import { Resume } from "../models/Resume";
import { SubscriptionTier } from "../types";

const STALE_AFTER_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface SectionGap {
  resumeId: string;
  title: string;
  missing: string[];
}

interface StaleResume {
  resumeId: string;
  title: string;
  daysSinceUpdate: number;
}

interface ResumeAnalytics {
  strengthDistribution: { strong: number; moderate: number; needsWork: number };
  sectionGaps: SectionGap[];
  staleResumes: StaleResume[];
  viewTrend: { thisWeek: number; lastWeek: number; daily: { date: string; count: number }[] };
  scoreTrend: { averageDelta: number; improved: { resumeId: string; title: string; delta: number }[] };
  recurringMissingKeywords: KeywordGapCount[];
  comparison: {
    strongest: { resumeId: string; title: string; score: number };
    weakest: { resumeId: string; title: string; score: number };
    gapDrivers: string[];
  } | null;
}

export class DashboardController {
  constructor(
    private readonly resumeService: ResumeService = new ResumeService(),
    private readonly subscriptionService: SubscriptionService = new SubscriptionService(),
    private readonly analyticsRepo: ResumeAnalyticsRepository = new ResumeAnalyticsRepository()
  ) {}

  summary = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const resumes = await this.resumeService.listForUser(user.id);
    const usage = await this.subscriptionService.usageFor(user);

    // Resume Analytics (view trend, score trend, section gaps, staleness,
    // strongest/weakest comparison) is a Premium perk — Starter and
    // Professional get the simpler myResumes/profileStrengthScore fields
    // only, same tiering as the rest of the Premium-only dashboard content.
    const resumeAnalytics =
      user.subscriptionTier === SubscriptionTier.Premium ? await this.buildResumeAnalytics(resumes) : null;

    res.json({
      myResumes: resumes.map((r) => r.toJSON()),
      sharedLinks: resumes.map((r) => ({ title: r.title, slug: r.slug, visibility: r.visibility })),
      resumeViews: resumes.reduce((sum, r) => sum + r.viewCount, 0),
      profileStrengthScore: this.averageStrengthScore(resumes),
      suggestedImprovements: this.suggestImprovements(resumes),
      resumeAnalytics,
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

  /**
   * The Premium dashboard's "Resume Analytics" section. Everything here is
   * either derived on the fly from fields already stored on each resume
   * (strength distribution, section gaps, staleness, strongest/weakest
   * comparison) or aggregated from the two lightweight event-log tables
   * (resume_views, resume_score_snapshots) written to by ResumeService.
   */
  private async buildResumeAnalytics(resumes: Resume[]): Promise<ResumeAnalytics | null> {
    if (resumes.length === 0) return null;
    const resumeIds = resumes.map((r) => r.id);

    const [daily, scoreTrends, recurringMissingKeywords] = await Promise.all([
      this.analyticsRepo.dailyViewCounts(resumeIds, 14),
      this.analyticsRepo.scoreTrend(resumeIds, 30),
      this.analyticsRepo.recurringMissingKeywords(resumeIds, 8),
    ]);

    return {
      strengthDistribution: this.strengthDistribution(resumes),
      sectionGaps: this.sectionGaps(resumes),
      staleResumes: this.staleResumes(resumes),
      viewTrend: this.viewTrend(daily),
      scoreTrend: this.scoreTrend(resumes, scoreTrends),
      recurringMissingKeywords,
      comparison: this.comparison(resumes),
    };
  }

  private strengthDistribution(resumes: Resume[]): ResumeAnalytics["strengthDistribution"] {
    const distribution = { strong: 0, moderate: 0, needsWork: 0 };
    for (const r of resumes) {
      if (r.strengthScore >= 80) distribution.strong++;
      else if (r.strengthScore >= 50) distribution.moderate++;
      else distribution.needsWork++;
    }
    return distribution;
  }

  /** What's missing from a resume, in the same terms Resume.strengthScore weighs (plus a couple of purely structural fields it doesn't) — the "why" behind a low score. */
  private missingSections(resume: Resume): string[] {
    const missing: string[] = [];
    if (!resume.contactPhone.trim()) missing.push("phone number");
    if (!resume.contactLinkedIn.trim()) missing.push("LinkedIn URL");
    if (resume.education.length === 0) missing.push("education");
    if (resume.awards.length === 0) missing.push("awards");
    if (resume.achievements.length === 0) missing.push("achievements");
    if (resume.generatedBullets.length < 3) missing.push("impact bullets");
    if (resume.generatedSummary.trim().length < 80) missing.push("a fuller summary");
    return missing;
  }

  private sectionGaps(resumes: Resume[]): SectionGap[] {
    return resumes
      .map((r) => ({ resumeId: r.id, title: r.title, missing: this.missingSections(r) }))
      .filter((g) => g.missing.length > 0);
  }

  private staleResumes(resumes: Resume[]): StaleResume[] {
    const now = Date.now();
    return resumes
      .map((r) => ({ resumeId: r.id, title: r.title, daysSinceUpdate: Math.floor((now - new Date(r.updatedAt).getTime()) / MS_PER_DAY) }))
      .filter((r) => r.daysSinceUpdate >= STALE_AFTER_DAYS)
      .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
      .slice(0, 5);
  }

  private viewTrend(daily: { date: string; count: number }[]): ResumeAnalytics["viewTrend"] {
    const byDate = new Map(daily.map((d) => [d.date, d.count]));
    // Fills every one of the last 14 days (oldest first) so the client can
    // render a continuous chart instead of a sparse one with gaps on
    // no-view days — resume_views simply has no row for a quiet day.
    const series: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      series.push({ date: key, count: byDate.get(key) ?? 0 });
    }
    const thisWeek = series.slice(7, 14).reduce((sum, d) => sum + d.count, 0);
    const lastWeek = series.slice(0, 7).reduce((sum, d) => sum + d.count, 0);
    return { thisWeek, lastWeek, daily: series };
  }

  private scoreTrend(
    resumes: Resume[],
    trends: { resumeId: string; oldest: number; newest: number }[]
  ): ResumeAnalytics["scoreTrend"] {
    const titleById = new Map(resumes.map((r) => [r.id, r.title]));
    const deltas = trends.map((t) => ({ resumeId: t.resumeId, title: titleById.get(t.resumeId) ?? "", delta: t.newest - t.oldest }));
    const averageDelta = deltas.length === 0 ? 0 : Math.round(deltas.reduce((sum, d) => sum + d.delta, 0) / deltas.length);
    const improved = deltas
      .filter((d) => d.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3);
    return { averageDelta, improved };
  }

  private comparison(resumes: Resume[]): ResumeAnalytics["comparison"] {
    if (resumes.length < 2) return null;
    const sorted = [...resumes].sort((a, b) => b.strengthScore - a.strengthScore);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    if (strongest.id === weakest.id) return null;
    const strongestGaps = new Set(this.missingSections(strongest));
    // What the weakest resume is missing that the strongest one isn't — the
    // most actionable "close the gap" list, rather than just its full
    // missingSections() (some gaps may be shared by both resumes).
    const gapDrivers = this.missingSections(weakest).filter((m) => !strongestGaps.has(m));
    return {
      strongest: { resumeId: strongest.id, title: strongest.title, score: strongest.strengthScore },
      weakest: { resumeId: weakest.id, title: weakest.title, score: weakest.strengthScore },
      gapDrivers,
    };
  }
}
