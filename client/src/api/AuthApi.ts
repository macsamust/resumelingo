import { ApiClient } from "./ApiClient";
import { AuthUser } from "../types";

// SEC-A01 (Sep 2026): no `token` field anymore — login/register set the
// access+refresh cookies server-side (see AuthController.ts); the client
// never sees the token value at all.
export interface AuthResponse {
  user: AuthUser;
}

export class AuthApi extends ApiClient {
  register(input: { name: string; email: string; password: string; profession?: string; acceptedTerms: boolean }) {
    return this.post<AuthResponse>("/auth/register", input);
  }

  login(input: { email: string; password: string }) {
    return this.post<AuthResponse>("/auth/login", input);
  }

  me() {
    return this.get<{ user: AuthUser }>("/auth/me");
  }

  updateProfile(input: { name?: string; email?: string; profession?: string | null }) {
    return this.put<{ user: AuthUser }>("/auth/me", input);
  }

  /**
   * Changing your password bumps the account's tokenVersion server-side and
   * revokes every other refresh token, which invalidates every other
   * already-issued session — the worker sets fresh access+refresh cookies
   * for THIS session in the same response, so it keeps working
   * uninterrupted with no client-side token handling needed.
   */
  changePassword(input: { currentPassword: string; newPassword: string }) {
    return this.put<{ success: true }>("/auth/me/password", input);
  }

  /** Self-service "log out of all other devices" — bumps tokenVersion and revokes every refresh token, invalidating every previously-issued session including this tab's (the worker also clears this tab's cookies in the same response). The caller should expect to be logged out immediately after this resolves. */
  revokeSessions() {
    return this.post<{ success: true }>("/auth/me/revoke-sessions", {});
  }

  /** Server-side logout (see AuthController.logout) — revokes this session's refresh token and clears both auth cookies. Always call this rather than just clearing client state, now that there's a real server-side session to end. */
  logout() {
    return this.post<{ success: true }>("/auth/logout", {});
  }

  /** Always resolves the same way whether or not the email matches an account — see AuthService.requestPasswordReset. */
  forgotPassword(email: string) {
    return this.post<{ success: true }>("/auth/forgot-password", { email });
  }

  resetPassword(input: { token: string; newPassword: string }) {
    return this.post<{ success: true }>("/auth/reset-password", input);
  }

  updateEmailPreferences(input: { viewDigestOptOut: boolean; resumeRefreshOptOut: boolean; resumeRefreshCadenceDays: number }) {
    return this.put<{ user: AuthUser }>("/auth/me/email-preferences", input);
  }

  /** Public — no auth token needed, this is reached from an email link. See AuthController.unsubscribeDigest for why it's a POST from a button click rather than a bare GET link. */
  unsubscribeDigest(token: string) {
    return this.post<{ success: true }>("/auth/unsubscribe-digest", { token });
  }

  /** Public — reached from the verification email's link. Safe to auto-fire on page load, unlike unsubscribeDigest — see AuthController.verifyEmail. */
  verifyEmail(token: string) {
    return this.post<{ success: true }>("/auth/verify-email", { token });
  }

  /** Logged-in only — powers the "Resend verification email" button on AppShell's nudge banner. */
  resendVerification() {
    return this.post<{ success: true }>("/auth/resend-verification", {});
  }
}
