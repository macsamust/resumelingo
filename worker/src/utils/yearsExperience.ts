/**
 * Self-updating "Years of Experience" (CJ, Nov 2026). The Additional Details
 * answer is a number typed once, which goes stale a year later. Instead of
 * asking the owner to re-enter it every year, the stored value is paired with
 * the date it was entered, and the *effective* value everywhere it's shown is
 * base + whole years elapsed since that date.
 *
 * Storage needs no migration: the base stays in answers.yearsExperience and
 * the as-of date rides along in the same answers JSON under a reserved key,
 * which the Resume model strips before the answers reach any client or
 * generator. Everything downstream (edit page, public link, PDF, versions)
 * just sees the effective number.
 *
 * The generated Summary is stored with the base number in its "N+ years of
 * experience" phrase; the Resume model swaps that phrase to the effective
 * number on read (see refreshSummaryYears), so the stored text never has to
 * be regenerated just because a year passed.
 */
export const YEARS_KEY = "yearsExperience";
export const YEARS_ASOF_KEY = "_yearsExperienceAsOf";

/** Only a plain whole number is auto-updated; anything else ("10-15", "a decade") is left exactly as typed. */
export function parseYears(value: string | undefined | null): number | null {
  const trimmed = (value ?? "").trim();
  return /^\d{1,2}$/.test(trimmed) ? parseInt(trimmed, 10) : null;
}

/** Whole anniversaries between two dates (calendar-based, so Feb 29 and month lengths behave). Never negative. */
export function wholeYearsBetween(fromIso: string, now: Date): number {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return 0;
  let years = now.getUTCFullYear() - from.getUTCFullYear();
  const beforeAnniversary =
    now.getUTCMonth() < from.getUTCMonth() ||
    (now.getUTCMonth() === from.getUTCMonth() && now.getUTCDate() < from.getUTCDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
}

export interface ResolvedYears {
  /** answers with the reserved key removed and yearsExperience replaced by the effective value (when it's a plain number). */
  answers: Record<string, string>;
  /** The number as last typed/saved, or null when the field is empty or non-numeric. */
  base: number | null;
  /** The as-of date actually in force (stored, or the resume's last-updated date for resumes that predate this feature), or null when there's no numeric base. */
  asOf: string | null;
  /** True when asOf came from the stored key rather than the fallback. */
  asOfStored: boolean;
  /** base + whole years since asOf, or null. */
  effective: number | null;
}

/**
 * `fallbackAsOf` is the resume's updatedAt: a resume saved before this feature
 * has no stored date, and counting from its last edit can only ever
 * under-count (never overstate) the experience.
 */
export function resolveYears(rawAnswers: Record<string, string>, fallbackAsOf: string, now: Date = new Date()): ResolvedYears {
  const { [YEARS_ASOF_KEY]: storedAsOf, ...rest } = rawAnswers;
  const base = parseYears(rest[YEARS_KEY]);
  if (base === null) return { answers: rest, base: null, asOf: null, asOfStored: false, effective: null };
  const asOf = storedAsOf || fallbackAsOf;
  const effective = base + wholeYearsBetween(asOf, now);
  return { answers: { ...rest, [YEARS_KEY]: String(effective) }, base, asOf, asOfStored: !!storedAsOf, effective };
}

/** Removes the reserved key (e.g. before answers go into an AI prompt). */
export function stripYearsMeta(answers: Record<string, string>): Record<string, string> {
  const { [YEARS_ASOF_KEY]: _ignored, ...rest } = answers;
  return rest;
}

/**
 * Swaps "{from}+ years of experience" for "{to}+ years of experience" in
 * summary text. Exact-phrase only, so a hand-edited summary that doesn't use
 * the number in that form is never touched.
 */
export function swapYearsPhrase(text: string, from: number, to: number): string {
  if (!text || from === to) return text;
  return text.split(`${from}+ years of experience`).join(`${to}+ years of experience`);
}

/**
 * Builds the answers object to persist. `incoming` is what the client sent,
 * which shows the *effective* number (that's what the edit page displays).
 * If it equals the current effective value the owner didn't change it, so the
 * stored base and date stay put; otherwise the typed number becomes the new
 * base as of today. A non-numeric or empty value drops the date.
 */
export function stampYearsForSave(
  incoming: Record<string, string>,
  current: ResolvedYears | null,
  now: Date = new Date()
): Record<string, string> {
  const { [YEARS_ASOF_KEY]: _ignored, ...rest } = incoming;
  const typed = parseYears(rest[YEARS_KEY]);
  if (typed === null) return rest;
  if (current && current.base !== null && current.asOf && current.effective === typed) {
    return { ...rest, [YEARS_KEY]: String(current.base), [YEARS_ASOF_KEY]: current.asOf };
  }
  return { ...rest, [YEARS_KEY]: String(typed), [YEARS_ASOF_KEY]: now.toISOString().slice(0, 10) };
}
