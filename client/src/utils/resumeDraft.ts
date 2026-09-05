import {
  AchievementEntry,
  AwardEntry,
  EducationEntry,
  LanguageEntry,
  LinkVisibility,
  ReferenceEntry,
  Resume,
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

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Which editor sections a found draft actually differs on from the resume's
 * last real save — shown in the "Restore them?" banner (ResumeEditPage) so
 * the choice isn't a blind guess. Labels match the editor's own
 * CollapsibleSection titles, so "Restore affects: Work Experience" points at
 * a section the person can immediately recognize.
 *
 * Deliberately excludes accessPasswordExpiresAt (stored in two different
 * formats between the draft and the resume record — comparing them directly
 * risks a false-positive "changed" on a field that's rarely touched anyway)
 * and photoUrl (a data: URL, so any real difference is already implied by
 * Info differing on something else practically every time it's touched).
 */
export function summarizeDraftChanges(draft: ResumeDraft, resume: Resume): string[] {
  const changed: string[] = [];
  const add = (label: string, isDifferent: boolean) => {
    if (isDifferent) changed.push(label);
  };

  add(
    "Info",
    draft.fullName !== resume.fullName ||
      draft.contactEmail !== resume.contactEmail ||
      draft.contactPhone !== resume.contactPhone ||
      draft.contactLinkedIn !== resume.contactLinkedIn ||
      draft.title !== resume.title ||
      draft.professionKey !== resume.profession ||
      !deepEqual(draft.answers, resume.answers)
  );
  add("Template", draft.templateKey !== resume.templateKey);
  add("Sharing", draft.visibility !== resume.visibility);
  add(
    "Work Experience",
    !deepEqual(draft.experience, resume.experience) || draft.combineExperienceFormat !== resume.combineExperienceFormat
  );
  add("Education", !deepEqual(draft.education, resume.education));
  add("Languages", !deepEqual(draft.languages ?? [], resume.languages));
  add("Highlights & Key Achievements", !deepEqual(draft.achievements, resume.achievements));
  add("Awards", !deepEqual(draft.awards, resume.awards));
  add("Skills & Tools", !deepEqual(draft.skillsAndTools, resume.skillsAndTools));
  add(
    "Recruiter Mode",
    draft.recruiterModeEnabled !== resume.recruiterModeEnabled ||
      draft.recruiterLocation !== resume.recruiterLocation ||
      draft.recruiterAvailability !== resume.recruiterAvailability ||
      draft.recruiterClearance !== resume.recruiterClearance ||
      draft.recruiterWorkAuthorization !== resume.recruiterWorkAuthorization ||
      draft.recruiterExpectedSalary !== resume.recruiterExpectedSalary ||
      draft.recruiterRemotePreference !== resume.recruiterRemotePreference
  );
  add(
    "References",
    draft.referencesEnabled !== resume.referencesEnabled ||
      !deepEqual(draft.references, resume.references) ||
      draft.referencesRecruiterModeOnly !== resume.referencesRecruiterModeOnly
  );
  add("Cover Letter", draft.coverLetterEnabled !== resume.coverLetterEnabled);

  return changed;
}

/**
 * Renders a `summarizeDraftChanges` result as a short, fixed-length phrase
 * for the restore banner — capped at 2 named sections so the banner stays a
 * single line no matter how much of the form the draft actually touched
 * (there are 9 possible labels; joining all of them unbounded could produce
 * a line longer than the page is wide).
 */
export function formatDraftChangeList(changes: string[]): string {
  if (changes.length <= 2) return changes.join(", ");
  const [shown, remaining] = [changes.slice(0, 2), changes.length - 2];
  return `${shown.join(", ")}, and ${remaining} more`;
}
