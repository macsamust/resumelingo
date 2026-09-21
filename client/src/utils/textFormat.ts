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

/**
 * Formats a US phone number as the person types it into `nnn-nnn-nnnn`.
 * Used on the contact-info Phone field in both the resume builder and
 * editor (New Resume / Edit Resume), which previously took the number as
 * raw free text.
 *
 * Deliberately US-only (10 digits, no country code) — this is a resume
 * contact field, not a validated account field, so an international
 * number or an extension (e.g. "+44 20 7946 0958" or "x204") is passed
 * through unformatted rather than mangled, by only reformatting once
 * everything the person typed is plain digits. Caps at 10 digits; typing
 * past that is a no-op rather than silently dropping characters into a
 * second, meaningless group.
 */
export function formatPhoneNumber(value: string): string {
  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length === 0) return value;
  if (value.replace(/[\s()-]/g, "") !== digitsOnly) return value; // has a "+", letters, etc. (country code, extension) — leave it alone

  const digits = digitsOnly.slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
