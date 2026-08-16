import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import {
  AchievementEntry,
  AwardEntry,
  EducationEntry,
  LinkVisibility,
  SubscriptionTier,
  WorkExperienceEntry,
} from "../types";

// Keeps a single pasted job description from flooding resume_keyword_checks
// — the client only ever sends the top ~20 missing keywords anyway (see
// client's utils/atsCheck.ts matchKeywords `max` default), this is just a
// server-side backstop against a malformed or hostile request.
const MAX_KEYWORDS_PER_CHECK = 30;
const MAX_KEYWORD_LENGTH = 40;

/** Same responsibilities as the Node/Express ResumeController, including recordKeywordCheck (see ResumeAnalyticsRepository). */
export class ResumeController {
  list = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    const resumes = await resumeService.listForUser(user.id);
    return c.json({ resumes: resumes.map((r) => r.toJSON()) });
  };

  get = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    const resume = await resumeService.getOwned(user.id, c.req.param("id")!);
    return c.json({ resume: resume.toJSON() });
  };

  create = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
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
    } = body;
    if (!title || !profession || !templateKey || !answers) {
      return c.json({ error: "title, profession, templateKey, and answers are required." }, 400);
    }
    const resume = await resumeService.create(user, {
      fullName: fullName as string | undefined,
      contactEmail: contactEmail as string | undefined,
      contactPhone: contactPhone as string | undefined,
      contactLinkedIn: contactLinkedIn as string | undefined,
      photoUrl: photoUrl as string | undefined,
      title: title as string,
      profession: profession as string,
      templateKey: templateKey as string,
      visibility: visibility as LinkVisibility | undefined,
      accessPassword: accessPassword as string | null | undefined,
      accessPasswordExpiresAt: accessPasswordExpiresAt as string | null | undefined,
      coverLetterEnabled: coverLetterEnabled as boolean | undefined,
      answers: answers as Record<string, string>,
      experience: experience as WorkExperienceEntry[] | undefined,
      education: education as EducationEntry[] | undefined,
      awards: awards as AwardEntry[] | undefined,
      achievements: achievements as AchievementEntry[] | undefined,
    });
    return c.json({ resume: resume.toJSON() }, 201);
  };

  /** POST /api/resumes/:id/clone — duplicates a resume the user owns under a new, required title (which also becomes the new public link's slug). */
  clone = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { title, templateKey } = body;
    if (!title || typeof title !== "string" || !title.trim()) {
      return c.json({ error: "A unique title is required to clone a resume." }, 400);
    }
    const resume = await resumeService.clone(user, c.req.param("id")!, {
      title: title.trim(),
      templateKey: templateKey as string | undefined,
    });
    return c.json({ resume: resume.toJSON() }, 201);
  };

  update = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const resume = await resumeService.update(user.id, c.req.param("id")!, body);
    return c.json({ resume: resume.toJSON() });
  };

  remove = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    await resumeService.delete(user.id, c.req.param("id")!);
    return c.body(null, 204);
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
  recordKeywordCheck = async (c: Context<AppEnv>) => {
    const { resumeService, resumeAnalyticsRepository } = c.get("services");
    const user = c.get("user")!;
    await resumeService.getOwned(user.id, c.req.param("id")!); // throws if not found/owned
    if (user.subscriptionTier !== SubscriptionTier.Premium) return c.body(null, 204);

    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { missingKeywords } = body;
    if (!Array.isArray(missingKeywords)) {
      return c.json({ error: "missingKeywords must be an array of strings." }, 400);
    }
    const cleaned = missingKeywords
      .filter((w): w is string => typeof w === "string" && w.trim().length > 0)
      .slice(0, MAX_KEYWORDS_PER_CHECK)
      .map((w) => w.trim().toLowerCase().slice(0, MAX_KEYWORD_LENGTH));

    await resumeAnalyticsRepository.recordKeywordCheck(c.req.param("id")!, cleaned);
    return c.body(null, 204);
  };

  /** GET /api/resumes/:id/versions — newest first. Professional/Premium-gated (see ResumeService.listVersions). */
  listVersions = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    const versions = await resumeService.listVersions(user, c.req.param("id")!);
    return c.json({ versions });
  };

  /** POST /api/resumes/:id/versions/:versionId/restore — reverts this resume's content to a past version, itself creating a new version first so the restore is undoable. */
  restoreVersion = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    const resume = await resumeService.restoreVersion(user, c.req.param("id")!, c.req.param("versionId")!);
    return c.json({ resume: resume.toJSON() });
  };
}
