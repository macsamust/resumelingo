/**
 * Deterministic, offline keyword extraction — same "reads like AI but isn't"
 * approach as ContentGenerator.ts. Used by Resume.recruiterCard to derive
 * the Recruiter Mode candidate card's "skills" list from the resume's own
 * generated bullets and profession answers, rather than a separate field to
 * fill in. Identical to the Node/Express version — no I/O.
 */
const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "with", "this", "that", "from", "have", "has",
  "will", "our", "their", "they", "them", "into", "about", "than", "then", "were", "was", "been", "being",
  "who", "what", "when", "where", "why", "how", "all", "any", "can", "could", "should", "would", "may", "might",
  "must", "shall", "each", "such", "some", "more", "most", "other", "these", "those", "which",
  "job", "role", "work", "team", "years", "year", "including", "etc", "also", "within", "across", "per",
  "using", "use", "used", "ability", "strong", "excellent", "responsibilities",
  "requirements", "required", "preferred", "please", "apply", "candidate", "candidates",
]);

/** Lowercase words 4+ letters long, excluding stopwords, ranked by frequency (most-mentioned first). */
export function extractKeywords(text: string, max = 8): string[] {
  const counts = new Map<string, number>();
  const words = text.toLowerCase().match(/[a-z][a-z+.#-]{2,}/g) ?? [];
  for (const raw of words) {
    const word = raw.replace(/^[-.#]+|[-.#]+$/g, "");
    if (word.length < 4 || STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word]) => word);
}
