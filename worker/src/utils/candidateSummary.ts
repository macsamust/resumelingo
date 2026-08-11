import { AchievementEntry, WorkExperienceEntry } from "../types";

/**
 * Deterministic "reads like AI but isn't" candidate summary for the
 * Recruiter Mode card (see Resume.recruiterCard) — same philosophy as
 * ContentGenerator.ts/CoverLetterGenerator.ts: template sentences filled in
 * from data the resume already has, never a live LLM call, and never a
 * fabricated stat. Identical to the Node/Express version — no I/O.
 */
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const MAX_CLAUSE_LENGTH = 140;

export interface CandidateSummaryInput {
  professionLabel: string;
  title: string;
  experience: WorkExperienceEntry[];
  achievements: AchievementEntry[];
  generatedBullets: string[];
  skills: string[];
}

export function buildCandidateSummary(input: CandidateSummaryInput): string {
  const years = yearsOfExperience(input.experience);
  const achievementClause = quantifiedAchievementClause(input.achievements, input.generatedBullets);
  const expertiseClause = technicalExpertiseClause(input.skills);
  const focusArea = input.professionLabel.trim() || "professional";

  let sentenceA = `${years !== null ? `${years}+ years of experience` : "Experienced"} as ${article(focusArea)} ${focusArea}`;
  sentenceA += achievementClause ? `, with a track record including ${achievementClause}.` : ".";

  const direction = input.title.trim() ? `pursuing ${input.title.trim()} opportunities` : `pursuing new ${focusArea} opportunities`;
  const sentenceB = expertiseClause ? `Skilled in ${expertiseClause}, currently ${direction}.` : `Currently ${direction}.`;

  return `${sentenceA} ${sentenceB}`;
}

/** Whole years between the earliest work-history start date and the latest end date (or now, for a current role). Null when there's no parseable work history to measure. */
function yearsOfExperience(experience: WorkExperienceEntry[]): number | null {
  const starts: number[] = [];
  const ends: number[] = [];
  for (const job of experience) {
    const start = parseMonth(job.startDate);
    if (start !== null) starts.push(start);
    const end = job.current ? Date.now() : parseMonth(job.endDate);
    if (end !== null) ends.push(end);
  }
  if (starts.length === 0 || ends.length === 0) return null;
  const years = Math.floor((Math.max(...ends) - Math.min(...starts)) / MS_PER_YEAR);
  return years >= 1 ? years : null;
}

function parseMonth(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/** A specific, already-written quantified result — an achievement's "result" field if it contains a number, otherwise a bullet's "resulting in ..." clause. Never invented. */
function quantifiedAchievementClause(achievements: AchievementEntry[], bullets: string[]): string | null {
  const fromAchievement = achievements.map((a) => a.result).find((r) => r && /\d/.test(r));
  if (fromAchievement) return asClause(fromAchievement);

  for (const bullet of bullets) {
    const match = bullet.match(/resulting in ([^.]+)\./i);
    if (match && /\d/.test(match[1])) return asClause(match[1]);
  }
  return null;
}

/** Up to the top 3 already-extracted skill keywords, joined as a natural list — no new extraction, just reusing Resume.recruiterCard's existing skills list. */
function technicalExpertiseClause(skills: string[]): string | null {
  const top = skills.slice(0, 3);
  if (top.length === 0) return null;
  if (top.length === 1) return top[0];
  if (top.length === 2) return `${top[0]} and ${top[1]}`;
  return `${top[0]}, ${top[1]}, and ${top[2]}`;
}

/** "a" or "an", based on the focus area's leading sound. */
function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

/** Lowercases the first letter and strips trailing punctuation/length so a user-written field reads naturally mid-sentence, matching ContentGenerator.ts's own asClause() convention. */
function asClause(text: string): string {
  const trimmed = text.trim().replace(/[.!?]+$/, "");
  const lower = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  if (lower.length <= MAX_CLAUSE_LENGTH) return lower;
  const cut = lower.slice(0, MAX_CLAUSE_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}
