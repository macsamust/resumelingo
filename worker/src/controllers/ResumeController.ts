import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import {
  AchievementEntry,
  AwardEntry,
  EducationEntry,
  LinkVisibility,
  WorkExperienceEntry,
} from "../types";

/**
 * Same responsibilities as the Node/Express ResumeController, minus
 * recordKeywordCheck — it logs to server/'s resume_keyword_checks
 * analytics table, which is out of scope for this port (see
 * ResumeService's class comment).
 */
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
}
