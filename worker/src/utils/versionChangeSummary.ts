import { Resume } from "../models/Resume";
import { UpdateResumeInput } from "../repositories/ResumeRepository";
import { getTemplateByKey } from "../config/templates";

/**
 * Builds a short, human-readable description of what an update() call is
 * about to change, for display in Version History (see
 * VersionHistoryPanel.tsx) — the whole point being to let a subscriber tell
 * two saved versions apart without having to open both and compare. This is
 * intentionally a coarse "which sections touched" summary, not a full
 * field-level diff: good enough to jog memory ("oh right, that's when I
 * switched templates"), not a changelog.
 *
 * Only looks at keys actually present on `input` (a PATCH-style partial) —
 * fields the client didn't send are never considered "changed" here, and a
 * changed value that's deep-equal to the existing one (e.g. an autosave
 * that re-sends the same content) doesn't produce a false line item.
 */
export function summarizeVersionChange(existing: Resume, input: UpdateResumeInput): string {
  const lines: string[] = [];
  const changedDeep = (key: keyof UpdateResumeInput, existingValue: unknown): boolean => {
    if (!(key in input)) return false;
    const next = (input as Record<string, unknown>)[key];
    return JSON.stringify(next) !== JSON.stringify(existingValue);
  };

  if (input.templateKey !== undefined && input.templateKey !== existing.templateKey) {
    const fromName = getTemplateByKey(existing.templateKey)?.name ?? existing.templateKey;
    const toName = getTemplateByKey(input.templateKey)?.name ?? input.templateKey;
    lines.push(`Switched template from ${fromName} to ${toName}`);
  }
  if (input.title !== undefined && input.title !== existing.title) {
    lines.push(`Renamed to "${input.title}"`);
  }
  if (input.fullName !== undefined && input.fullName !== existing.fullName) {
    lines.push("Updated name");
  }
  if (
    (input.contactEmail !== undefined && input.contactEmail !== existing.contactEmail) ||
    (input.contactPhone !== undefined && input.contactPhone !== existing.contactPhone) ||
    (input.contactLinkedIn !== undefined && input.contactLinkedIn !== existing.contactLinkedIn)
  ) {
    lines.push("Updated contact info");
  }
  if (input.photoUrl !== undefined && input.photoUrl !== existing.photoUrl) {
    lines.push(input.photoUrl ? "Updated photo" : "Removed photo");
  }
  if (input.profession !== undefined && input.profession !== existing.profession) {
    lines.push("Changed profession");
  }
  if (changedDeep("answers", existing.answers)) lines.push("Updated Additional Details");
  if (changedDeep("experience", existing.experience)) lines.push("Updated Work Experience");
  if (changedDeep("education", existing.education)) lines.push("Updated Education");
  if (changedDeep("awards", existing.awards)) lines.push("Updated Awards");
  if (changedDeep("achievements", existing.achievements)) lines.push("Updated Key Achievements");
  if (changedDeep("skillsAndTools", existing.skillsAndTools)) lines.push("Updated Skills & Tools");
  if (changedDeep("languages", existing.languages)) lines.push("Updated Languages");
  if (
    changedDeep("generatedSummary", existing.generatedSummary) ||
    changedDeep("generatedBullets", existing.generatedBullets)
  ) {
    lines.push("Updated Summary & Bullets");
  }
  if (input.combineExperienceFormat !== undefined && input.combineExperienceFormat !== existing.combineExperienceFormat) {
    lines.push("Changed experience layout");
  }
  if (
    input.recruiterModeEnabled !== undefined ||
    changedDeep("recruiterLocation", existing.recruiterLocation) ||
    changedDeep("recruiterAvailability", existing.recruiterAvailability) ||
    changedDeep("recruiterClearance", existing.recruiterClearance) ||
    changedDeep("recruiterWorkAuthorization", existing.recruiterWorkAuthorization) ||
    changedDeep("recruiterExpectedSalary", existing.recruiterExpectedSalary) ||
    changedDeep("recruiterRemotePreference", existing.recruiterRemotePreference)
  ) {
    lines.push("Updated Recruiter Mode");
  }
  if (
    input.referencesEnabled !== undefined ||
    changedDeep("references", existing.references) ||
    input.referencesRecruiterModeOnly !== undefined
  ) {
    lines.push("Updated References");
  }
  if (input.coverLetterEnabled !== undefined && input.coverLetterEnabled !== existing.coverLetterEnabled) {
    lines.push(input.coverLetterEnabled ? "Turned on AI cover letter" : "Turned off AI cover letter");
  }

  // Dedupe (a couple of the checks above can theoretically both fire from
  // one shared cause) while preserving first-seen order.
  const unique = [...new Set(lines)];
  if (unique.length === 0) return "Updated resume";
  const MAX_ITEMS = 3;
  if (unique.length > MAX_ITEMS) {
    return `${unique.slice(0, MAX_ITEMS).join(", ")}, +${unique.length - MAX_ITEMS} more`;
  }
  return unique.join(", ");
}
