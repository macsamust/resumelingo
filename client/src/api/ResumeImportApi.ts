import { ApiClient } from "./ApiClient";
import { AchievementEntry, AwardEntry, EducationEntry, SkillOrTool, WorkExperienceEntry } from "../types";

export interface ImportedResumeData {
  fullName: string;
  contactEmail: string;
  contactPhone: string;
  contactLinkedIn: string;
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  skillsAndTools: SkillOrTool[];
  awards: AwardEntry[];
  /** Mostly action-only achievements, each optionally linked to a job via experienceId — see worker's ResumeImportService.ImportedResumeData.achievements' doc comment for why. Feeds the same achievements state as AchievementEditor/HighlightsEditor. */
  achievements: AchievementEntry[];
  /** Callouts from the AI about fields it was unsure of (e.g. an inferred/missing date) — always show these next to the review step, never silently drop them. */
  notes: string[];
}

/**
 * POST /api/resume-import — see worker's ResumeImportController/
 * ResumeImportService. Professional/Premium-gated; text is extracted from the file
 * client-side first (see utils/resumeImportExtract.ts) so the server only
 * ever sees plain text, never the original file.
 *
 * Uses the default ApiClient base URL ("/api", or VITE_API_URL) like every
 * other API class here, just requesting the "/resume-import" path directly
 * rather than something nested under "/resumes" — the worker mounts this as
 * its own top-level route rather than under resumeRoutes (see
 * worker/src/index.ts's comment on why).
 */
export class ResumeImportApi extends ApiClient {
  extract(text: string) {
    return this.post<{ data: ImportedResumeData }>("/resume-import", { text });
  }
}
