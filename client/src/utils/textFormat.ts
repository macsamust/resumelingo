/**
 * Capitalizes the first letter of every word, leaving the rest of each word
 * untouched — so "data analyst" becomes "Data Analyst" but an existing
 * acronym like "IT support specialist" becomes "IT Support Specialist"
 * rather than getting force-lowercased into "It Support Specialist".
 */
export function titleCase(value: string): string {
  return value.replace(/\p{L}[\p{L}'’-]*/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

/** Same normalization as the server's ResumeRepository.slugify — used client-side only for previewing what a public link will look like before it's created (e.g. the Clone dialog's slug preview), never to generate the real slug, which the server always owns. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
