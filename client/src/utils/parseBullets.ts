/**
 * Turns a pasted block of text (from Word, LinkedIn, Notes, an old resume)
 * into clean, one-per-entry bullet strings for the "Paste multiple bullets"
 * panel in AchievementEditor.
 *
 * Rules, in order of how often they matter:
 * - A leading bullet marker (•, -, *, –, 1., 2)) is stripped.
 * - A marker-led line starts a new bullet; a blank line always ends one.
 * - A line with no marker that is indented, or starts with a lowercase
 *   letter, continues the previous bullet (text that wrapped mid-sentence).
 *   Anything else is its own bullet, so a plain one-per-line paste works too.
 * - Whitespace is collapsed, and exact duplicates (ignoring case, spacing and
 *   a trailing period) are dropped, both within the paste and against
 *   `existing` (the bullets already under that job).
 */
const MARKER = /^\s*(?:[•●▪◦‣▸►·*\-–—]|\d{1,2}[.)])\s+/;

export interface ParsedBullets {
  bullets: string[];
  /** Bullets dropped as duplicates. */
  skipped: number;
  /** Bullets built by joining a wrapped continuation line. */
  joined: number;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim();
}

export function parseBullets(raw: string, existing: string[] = []): ParsedBullets {
  const drafts: { text: string; joined: boolean }[] = [];
  let current: { text: string; joined: boolean } | null = null;

  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    if (line.trim() === "") {
      current = null;
      continue;
    }
    const hasMarker = MARKER.test(line);
    const indented = /^\s+\S/.test(line);
    const startsLower = /^\s*[a-z]/.test(line);
    if (current && !hasMarker && (indented || startsLower)) {
      current.text += ` ${line.trim()}`;
      current.joined = true;
      continue;
    }
    current = { text: line.replace(MARKER, "").trim(), joined: false };
    drafts.push(current);
  }

  const seen = new Set(existing.map(normalize).filter(Boolean));
  const bullets: string[] = [];
  let skipped = 0;
  let joined = 0;
  for (const d of drafts) {
    const text = d.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const key = normalize(text);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    bullets.push(text);
    if (d.joined) joined += 1;
  }
  return { bullets, skipped, joined };
}
