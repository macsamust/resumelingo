import { ApiClient } from "./ApiClient";
import { AuthUser } from "../types";

export interface AuthResponse {
  user: AuthUser;
  token: string;
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
   * Changing your password bumps the account's tokenVersion server-side,
   * which invalidates every other already-issued session — but the
   * response hands back a freshly-signed token for THIS session so it
   * keeps working uninterrupted. Callers must persist the returned token
   * (see setAuthToken) or the very next authenticated request from this
   * tab will itself get logged out.
   */
  changePassword(input: { currentPassword: string; newPassword: string }) {
    return this.put<{ success: true; token: string }>("/auth/me/password", input);
  }

  /** Self-service "log out of all other devices" — bumps tokenVersion, invalidating every previously-issued token including this tab's. The caller should expect to be logged out immediately after this resolves. */
  revokeSessions() {
    return this.post<{ success: true }>("/auth/me/revoke-sessions", {});
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
