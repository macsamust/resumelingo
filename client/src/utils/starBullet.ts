import { AchievementEntry, WorkExperienceEntry } from "../types";

/**
 * Turns one Challenge/Action/Result achievement into a single resume bullet
 * sentence. Deliberately duplicated from server/src/services/ContentGenerator.ts's
 * private toStarBullet()/asClause()/capitalize() methods rather than shared —
 * this is a separate TypeScript project/build with no shared code today (same
 * precedent as atsCheck.ts, recruiterOptions.ts, keywords.ts). Needed
 * client-side so the "combine Work Experience with Achievements" preview can
 * compute bullets live, instead of relying on the server's last-saved
 * generatedBullets array, whose .filter()-based construction doesn't
 * guarantee positional correspondence with the achievements array.
 */
export function starBulletFromAchievement(achievement: AchievementEntry): string | undefined {
  const action = asClause(achievement.action);
  const challenge = asClause(achievement.challenge);
  const result = asClause(achievement.result);

  const segments: string[] = [];
  if (action) segments.push(capitalize(action));
  if (challenge) segments.push(`in response to ${challenge}`);
  if (result) segments.push(`resulting in ${result}`);

  if (segments.length === 0) return undefined;
  return `${segments.join(", ")}.`;
}

function asClause(text: string | undefined): string {
  if (!text) return "";
  const trimmed = text.trim().replace(/[.!?]+$/, "");
  if (!trimmed) return "";
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Groups achievement bullets by the WorkExperienceEntry.id they're linked
 * to, for the "combine Work Experience with Achievements" layout. Returns a
 * map keyed by experience id (only ids present in `experience` are used —
 * achievements linked to a since-deleted job fall into `unlinked`, same as
 * achievements with no experienceId set at all), plus the leftover bullets
 * that aren't tied to any specific job (rendered in a flat "Highlights"
 * section underneath the nested per-job lists, so no content is silently
 * dropped just because a link is missing).
 */
export function groupAchievementsByExperience(
  achievements: AchievementEntry[],
  experience: WorkExperienceEntry[]
): { byExperienceId: Record<string, string[]>; unlinked: string[] } {
  const validIds = new Set(experience.map((e) => e.id).filter((id): id is string => !!id));
  const byExperienceId: Record<string, string[]> = {};
  const unlinked: string[] = [];

  for (const achievement of achievements) {
    const bullet = starBulletFromAchievement(achievement);
    if (!bullet) continue;
    const experienceId = achievement.experienceId;
    if (experienceId && validIds.has(experienceId)) {
      (byExperienceId[experienceId] ??= []).push(bullet);
    } else {
      unlinked.push(bullet);
    }
  }

  return { byExperienceId, unlinked };
}
