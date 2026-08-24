import { ApiClient } from "./ApiClient";
import { AuthUser } from "../types";

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export class AuthApi extends ApiClient {
  register(input: { name: string; email: string; password: string; profession?: string }) {
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

  changePassword(input: { currentPassword: string; newPassword: string }) {
    return this.put<{ success: true }>("/auth/me/password", input);
  }

  /** Always resolves the same way whether or not the email matches an account — see AuthService.requestPasswordReset. */
  forgotPassword(email: string) {
    return this.post<{ success: true }>("/auth/forgot-password", { email });
  }

  resetPassword(input: { token: string; newPassword: string }) {
    return this.post<{ success: true }>("/auth/reset-password", input);
  }

  updateEmailPreferences(input: { viewDigestOptOut: boolean }) {
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
