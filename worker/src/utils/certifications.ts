import { CertificationEntry } from "../types";

/**
 * Turns the old Additional Details "Certifications" answer (one comma-,
 * semicolon- or newline-separated string, e.g. "PMP, CSM, Leadership
 * Academy") into one entry per item for the Certifications & Training
 * section. Blank pieces and exact duplicates (ignoring case) are dropped.
 */
export function splitLegacyCertifications(raw: string | undefined | null): CertificationEntry[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const entries: CertificationEntry[] = [];
  for (const piece of raw.split(/[,;\n]/)) {
    const name = piece.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    entries.push({ name });
  }
  return entries;
}

/** Joins entries back into the comma-separated form the content generators expect in `answers.certifications`. */
export function certificationsAnswer(entries: CertificationEntry[] | undefined): string {
  return (entries ?? []).map((e) => e.name.trim()).filter(Boolean).join(", ");
}
