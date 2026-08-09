/**
 * Generates a stable client-side id for things like a WorkExperienceEntry
 * that need to be referenced elsewhere (see AchievementEntry.experienceId).
 * Prefers crypto.randomUUID() (available in all modern browsers); falls back
 * to a timestamp+random string for older environments where it's missing.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
