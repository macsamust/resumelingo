import { ApiClient } from "./ApiClient";
import { AchievementEntry, AwardEntry, EducationEntry, LanguageEntry, LinkVisibility, ReferenceEntry, Resume, ResumeVersion, SkillOrTool, WorkExperienceEntry } from "../types";

export interface CreateResumeInput {
  fullName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  photoUrl?: string;
  title: string;
  profession: string;
  templateKey: string;
  visibility?: LinkVisibility;
  accessPassword?: string | null;
  accessPasswordExpiresAt?: string | null;
  /** Separate on/off switch for the public link — independent of visibility/password, so pausing a link never loses that setup. */
  active?: boolean;
  coverLetterEnabled?: boolean;
  /** "Recruiter Mode" toggle — only takes effect server-side for Premium subscribers (see ResumeService.update). */
  recruiterModeEnabled?: boolean;
  recruiterLocation?: string;
  recruiterAvailability?: string;
  recruiterClearance?: string;
  recruiterWorkAuthorization?: string;
  recruiterExpectedSalary?: string;
  recruiterRemotePreference?: string;
  /** "Combine Work Experience with Achievements" toggle — see types/index.ts Resume.combineExperienceFormat. Not tier-gated. */
  combineExperienceFormat?: boolean;
  answers: Record<string, string>;
  experience?: WorkExperienceEntry[];
  education?: EducationEntry[];
  awards?: AwardEntry[];
  achievements?: AchievementEntry[];
  /** "Skills & Tools" section — only rendered by the Portrait template. */
  skillsAndTools?: SkillOrTool[];
  /** Optional "Languages" section — see types/index.ts LanguageEntry. */
  languages?: LanguageEntry[];
  /** "References" section toggle — only takes effect server-side for Premium subscribers (see ResumeService.update), same gate as recruiterModeEnabled. */
  referencesEnabled?: boolean;
  references?: ReferenceEntry[];
  /** "Only add references to Recruiter Mode printout section when selecting 'View resume'" checkbox — see types/index.ts Resume.referencesRecruiterModeOnly. */
  referencesRecruiterModeOnly?: boolean;
  /** Direct hand-edit of the generated Summary/bullets text (Edit Resume's "Generated Summary & Bullets" panel) — sent together with summaryManuallyEdited: true from that panel's own save action, separate from the rest of this form. See types/index.ts Resume.summaryManuallyEdited. */
  generatedSummary?: string;
  generatedBullets?: string[];
  /** Send `false` to reset back to auto-generated (see ResumeService.update). */
  summaryManuallyEdited?: boolean;
}

export class ResumeApi extends ApiClient {
  list() {
    return this.get<{ resumes: Resume[] }>("/resumes");
  }

  getById(id: string) {
    return this.get<{ resume: Resume }>(`/resumes/${id}`);
  }

  create(input: CreateResumeInput) {
    return this.post<{ resume: Resume }>("/resumes", input);
  }

  update(id: string, input: Partial<CreateResumeInput>) {
    return this.put<{ resume: Resume }>(`/resumes/${id}`, input);
  }

  remove(id: string) {
    return this.del<void>(`/resumes/${id}`);
  }

  /** Duplicates a resume under a new, required title (which also becomes the new public link's slug) and, optionally, a different template. Everything else carries over as-is. */
  clone(id: string, input: { title: string; templateKey?: string }) {
    return this.post<{ resume: Resume }>(`/resumes/${id}/clone`, input);
  }

  /** Logs one ATS Check keyword match's missing-keyword list — see ResumeEditPage's debounced effect and utils/atsCheck.ts's matchKeywords. Fire-and-forget from the caller's perspective; server no-ops (204, no error) for non-Premium accounts. */
  recordKeywordCheck(id: string, missingKeywords: string[]) {
    return this.post<void>(`/resumes/${id}/keyword-check`, { missingKeywords });
  }

  /** Newest first. Professional/Premium-gated — see components/common/VersionHistoryPanel.tsx. */
  listVersions(id: string) {
    return this.get<{ versions: ResumeVersion[] }>(`/resumes/${id}/versions`);
  }

  /** Reverts this resume's content to a past version — itself creates a new version first, so the restore is undoable. */
  restoreVersion(id: string, versionId: string) {
    return this.post<{ resume: Resume }>(`/resumes/${id}/versions/${versionId}/restore`, {});
  }
}
