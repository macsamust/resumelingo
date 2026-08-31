/**
 * Shared source of truth for the language proficiency scale — used by
 * LanguagesEditor.tsx's dropdown (most fluent first) and by
 * ResumePreview.tsx/pdfExport.ts's proficiency-dot meter (see
 * proficiencyLevel below), so the two never drift apart the way two
 * hand-copied literal arrays eventually would.
 */
export const PROFICIENCY_SCALE = [
  "Native or Bilingual Proficiency",
  "Full Professional Proficiency",
  "Professional Working Proficiency",
  "Limited Working Proficiency",
  "Elementary Proficiency",
];

/** Total steps in the dot meter — one per PROFICIENCY_SCALE entry. */
export const PROFICIENCY_MAX_LEVEL = PROFICIENCY_SCALE.length;

/**
 * Maps a proficiency string to a 1-5 fill level for the dot meter (5 =
 * Native/Bilingual, the most fluent end of PROFICIENCY_SCALE; 1 =
 * Elementary). Returns 0 for anything that doesn't match the fixed
 * scale — a resume saved before this scale existed, or free text from
 * some other source — so the caller can render an empty/no-op meter
 * instead of guessing a level for text it doesn't recognize.
 */
export function proficiencyLevel(proficiency: string): number {
  const index = PROFICIENCY_SCALE.indexOf(proficiency);
  return index === -1 ? 0 : PROFICIENCY_SCALE.length - index;
}
