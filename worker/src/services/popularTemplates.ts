export interface ProfessionTemplateCount {
  profession: string;
  templateKey: string;
  count: number;
}

/**
 * Minimum total (non-Classic) resumes a profession needs before a "most
 * popular" badge is shown for it at all — with only a couple of resumes,
 * "3 of 4 nurses chose X" is a coin flip dressed up as a stat, not a real
 * signal. Revisit upward as the userbase grows; this is a starting point,
 * not a carefully tuned statistical threshold.
 */
export const MIN_PROFESSION_SAMPLE_SIZE = 20;

/**
 * The single most-used template per profession, from raw
 * (profession, templateKey, count) rows — see
 * ResumeRepository.countByProfessionAndTemplate, which already excludes
 * "classic" before this ever sees the data (that template is the untouched
 * Starter default, not a genuine choice; see that method's doc comment).
 * Only returns an entry for a profession once its qualifying resumes clear
 * MIN_PROFESSION_SAMPLE_SIZE, so a brand-new or rarely-picked profession
 * never shows a badge based on a handful of resumes. Ties are broken by
 * whichever template is encountered first in `counts` — not meaningful
 * enough to warrant a real tie-breaking rule.
 */
export function computePopularTemplates(counts: ProfessionTemplateCount[]): Record<string, string> {
  const totalsByProfession = new Map<string, number>();
  const bestByProfession = new Map<string, { templateKey: string; count: number }>();

  for (const row of counts) {
    totalsByProfession.set(row.profession, (totalsByProfession.get(row.profession) ?? 0) + row.count);
    const current = bestByProfession.get(row.profession);
    if (!current || row.count > current.count) {
      bestByProfession.set(row.profession, { templateKey: row.templateKey, count: row.count });
    }
  }

  const result: Record<string, string> = {};
  for (const [profession, total] of totalsByProfession) {
    if (total < MIN_PROFESSION_SAMPLE_SIZE) continue;
    const best = bestByProfession.get(profession);
    if (best) result[profession] = best.templateKey;
  }
  return result;
}
