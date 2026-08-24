/**
 * Server-side email format check — the only server-side validation that
 * existed before this was HTML5 `type="email"` on the client forms
 * (SignupPage/ProfilePage/LoginPage/ForgotPasswordPage), which anyone
 * calling the API directly skips entirely. Deliberately a simple, permissive
 * pattern rather than a full RFC 5322 implementation — the goal is to catch
 * obviously-malformed input (missing @, no domain, embedded whitespace)
 * before it reaches D1 or gets handed to Resend, not to reject every
 * technically-unusual-but-real address. No disposable-domain blocklist —
 * that's a separate, higher-maintenance decision (see TODO.md).
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** RFC 5321's own limit on a full email address. */
const MAX_EMAIL_LENGTH = 254;

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_PATTERN.test(trimmed);
}

/** Case-insensitive normalization applied at every write path (see AuthService.register/updateProfile) — trims surrounding whitespace and lowercases, so storage is consistent regardless of how the address was typed. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
