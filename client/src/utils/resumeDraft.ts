import {
  AchievementEntry,
  AwardEntry,
  EducationEntry,
  LanguageEntry,
  LinkVisibility,
  ReferenceEntry,
  SkillOrTool,
  WorkExperienceEntry,
} from "../types";

/**
 * A local, browser-only snapshot of everything editable on the Edit Resume
 * page — autosaved to localStorage as the user types so a closed tab or
 * crashed browser doesn't lose work that was never actually submitted via
 * "Save changes". Deliberately excludes `accessPassword`: it's the one
 * secret value on this form, and there's no good reason for it to sit in
 * localStorage any longer than the page needs it in memory.
 */
export interface ResumeDraft {
  /** ISO timestamp of when this draft was last written — used to decide whether a draft found on load is actually newer than the resume's last real save (see ResumeEditPage). */
  savedAt: string;
  fullName: string;
  contactEmail: string;
  contactPhone: string;
  contactLinkedIn: string;
  photoUrl: string;
  title: string;
  professionKey: string;
  templateKey: string;
  visibility: LinkVisibility;
  accessPasswordExpiresAt: string;
  answers: Record<string, string>;
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  awards: AwardEntry[];
  achievements: AchievementEntry[];
  skillsAndTools: SkillOrTool[];
  languages: LanguageEntry[];
  coverLetterEnabled: boolean;
  recruiterModeEnabled: boolean;
  recruiterLocation: string;
  recruiterAvailability: string;
  recruiterClearance: string;
  recruiterWorkAuthorization: string;
  recruiterExpectedSalary: string;
  recruiterRemotePreference: string;
  referencesEnabled: boolean;
  references: ReferenceEntry[];
  referencesRecruiterModeOnly: boolean;
  combineExperienceFormat: boolean;
}

function draftKey(resumeId: string): string {
  return `resumelingo:resume-draft:${resumeId}`;
}

/** Returns null if there's no draft, or if it's malformed/unreadable (e.g. a shape from a much older version of this page). */
export function loadDraft(resumeId: string): ResumeDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(resumeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof parsed.savedAt !== "string") return null;
    return parsed as ResumeDraft;
  } catch {
    return null;
  }
}

/** Fire-and-forget — a full disk / private-browsing quota error shouldn't interrupt editing, since autosave is a convenience, not the primary save path. */
export function saveDraft(resumeId: string, draft: Omit<ResumeDraft, "savedAt">): void {
  try {
    const withTimestamp: ResumeDraft = { ...draft, savedAt: new Date().toISOString() };
    localStorage.setItem(draftKey(resumeId), JSON.stringify(withTimestamp));
  } catch {
    // ignore — see comment above
  }
}

export function clearDraft(resumeId: string): void {
  try {
    localStorage.removeItem(draftKey(resumeId));
  } catch {
    // ignore
  }
}
