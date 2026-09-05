/**
 * Capitalizes the first letter of every word, leaving the rest of each word
 * untouched — so "data analyst" becomes "Data Analyst" but an existing
 * acronym like "IT support specialist" becomes "IT Support Specialist"
 * rather than getting force-lowercased into "It Support Specialist".
 */
export function titleCase(value: string): string {
  return value.replace(/\p{L}[\p{L}'’-]*/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
