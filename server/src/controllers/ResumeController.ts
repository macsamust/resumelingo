import { Response } from "express";
import { ResumeService } from "../services/ResumeService";
import { ResumeAnalyticsRepository } from "../repositories/ResumeAnalyticsRepository";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { SubscriptionTier } from "../types";

// Keeps a single pasted job description from flooding resume_keyword_checks
// — the client only ever sends the top ~20 missing keywords anyway (see
// utils/atsCheck.ts's matchKeywords `max` default), this is just a
// server-side backstop against a malformed or hostile request.
const MAX_KEYWORDS_PER_CHECK = 30;
const MAX_KEYWORD_LENGTH = 40;

export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService = new ResumeService(),
    private readonly analytics: ResumeAnalyticsRepository = new ResumeAnalyticsRepository()
  ) {}

  list = async (req: AuthenticatedRequest, res: Response) => {
    const resumes = await this.resumeService.listForUser(req.user!.id);
    res.json({ resumes: resumes.map((r) => r.toJSON()) });
  };

  get = async (req: AuthenticatedRequest, res: Response) => {
    const resume = await this.resumeService.getOwned(req.user!.id, req.params.id);
    res.json({ resume: resume.toJSON() });
  };

  create = async (req: AuthenticatedRequest, res: Response) => {
    const {
      fullName,
      contactEmail,
      contactPhone,
      contactLinkedIn,
      photoUrl,
      title,
      profession,
      templateKey,
      visibility,
      accessPassword,
      accessPasswordExpiresAt,
      coverLetterEnabled,
      answers,
      experience,
      education,
      awards,
      achievements,
    } = req.body ?? {};
    if (!title || !profession || !templateKey || !answers) {
      return res.status(400).json({ error: "title, profession, templateKey, and answers are required." });
    }
    const resume = await this.resumeService.create(req.user!, {
      fullName,
      contactEmail,
      contactPhone,
      contactLinkedIn,
      photoUrl,
      title,
      profession,
      templateKey,
      visibility,
      accessPassword,
      accessPasswordExpiresAt,
      coverLetterEnabled,
      answers,
      experience,
      education,
      awards,
      achievements,
    });
    res.status(201).json({ resume: resume.toJSON() });
  };

  /** POST /api/resumes/:id/clone — duplicates a resume the user owns under a new, required title (which also becomes the new public link's slug). */
  clone = async (req: AuthenticatedRequest, res: Response) => {
    const { title, templateKey } = req.body ?? {};
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "A unique title is required to clone a resume." });
    }
    const resume = await this.resumeService.clone(req.user!, req.params.id, { title: title.trim(), templateKey });
    res.status(201).json({ resume: resume.toJSON() });
  };

  update = async (req: AuthenticatedRequest, res: Response) => {
    const resume = await this.resumeService.update(req.user!.id, req.params.id, req.body ?? {});
    res.json({ resume: resume.toJSON() });
  };

  remove = async (req: AuthenticatedRequest, res: Response) => {
    await this.resumeService.delete(req.user!.id, req.params.id);
    res.status(204).send();
  };

  /**
   * Logs the missing-keyword list from one ATS Check job-description paste
   * (see client's ResumeEditPage debounced effect) so the Premium
   * dashboard's Resume Analytics can surface which keywords a user keeps
   * missing. The job description text itself is never sent — only the
   * resulting words, computed client-side by utils/atsCheck.ts's
   * matchKeywords. Premium-only (matching where the ATS Check UI that
   * triggers this is itself gated) and silently a no-op otherwise, rather
   * than an error — this is a background logging call, not a user action
   * worth surfacing a failure for.
   */
  recordKeywordCheck = async (req: AuthenticatedRequest, res: Response) => {
    await this.resumeService.getOwned(req.user!.id, req.params.id); // throws if not found/owned
    if (req.user!.subscriptionTier !== SubscriptionTier.Premium) return res.status(204).send();

    const { missingKeywords } = req.body ?? {};
    if (!Array.isArray(missingKeywords)) {
      return res.status(400).json({ error: "missingKeywords must be an array of strings." });
    }
    const cleaned = missingKeywords
      .filter((w): w is string => typeof w === "string" && w.trim().length > 0)
      .slice(0, MAX_KEYWORDS_PER_CHECK)
      .map((w) => w.trim().toLowerCase().slice(0, MAX_KEYWORD_LENGTH));

    await this.analytics.recordKeywordCheck(req.params.id, cleaned);
    res.status(204).send();
  };

  /** GET /api/resumes/:id/versions — newest first. Professional/Premium-gated (see ResumeService.listVersions). */
  listVersions = async (req: AuthenticatedRequest, res: Response) => {
    const versions = await this.resumeService.listVersions(req.user!, req.params.id);
    res.json({ versions });
  };

  /** POST /api/resumes/:id/versions/:versionId/restore — reverts this resume's content to a past version, itself creating a new version first so the restore is undoable. */
  restoreVersion = async (req: AuthenticatedRequest, res: Response) => {
    const resume = await this.resumeService.restoreVersion(req.user!, req.params.id, req.params.versionId);
    res.json({ resume: resume.toJSON() });
  };
}
