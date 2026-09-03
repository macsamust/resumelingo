import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/UserRepository";
import { TokenService } from "./TokenService";
import { EmailService } from "./EmailService";
import { User } from "../models/User";
import { AuthTokenPayload } from "../types";
import { isValidEmail, normalizeEmail } from "../utils/validation";
import { randomHex, sha256Hex } from "../utils/crypto";

export class AuthError extends Error {}

/** Thrown when a password-reset token is missing, doesn't match any user, or has expired — mapped to 400 in index.ts's onError. */
export class InvalidResetTokenError extends Error {}

/** Thrown when a verification-link token is missing, doesn't match any user, or has expired — same treatment as InvalidResetTokenError. */
export class InvalidVerificationTokenError extends Error {}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
// Matches the reset token's window — originally 24 hours, shortened to
// reduce how long a leaked link stays usable (e.g. forwarded mail, a shared
// inbox, browser history, an email-security scanner caching the URL). Note
// this is about leak exposure, not brute force: the token itself is a
// 256-bit random value, hashed at rest — guessing it isn't feasible at any
// window length. See EmailVerificationIpLogRepository for the actual
// scripted-guessing/abuse defense.
const VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Random 32-byte hex token — the value that goes in the email link. Shared by both the password-reset and email-verification flows. Only its SHA-256 hash (see ../utils/crypto's sha256Hex) is ever stored, same principle as password hashing, except plain SHA-256 (not bcrypt) is fine here since the input is already a high-entropy random token, not a low-entropy human password. */
function generateRandomToken(): string {
  return randomHex(32);
}

/**
 * Same responsibilities as the Node/Express AuthService, including the
 * `suspended` account check in login() — that column backs the admin
 * console's "disable a user's login" action (see AdminUserController /
 * migrations/0004_admin_catalog.sql), ported in Phase 3.
 */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService<AuthTokenPayload>,
    private readonly emailService: EmailService,
    private readonly clientOrigin: string
  ) {}

  async register(input: { name: string; email: string; password: string; profession?: string }) {
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) throw new AuthError("Please enter a valid email address.");
    const existing = await this.users.findByEmail(email);
    if (existing) throw new AuthError("An account with that email already exists.");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const record = await this.users.create({
      name: input.name,
      email,
      passwordHash,
      profession: input.profession ?? null,
    });
    const user = new User(record);
    const token = await this.tokens.sign({ userId: user.id, email: user.email });
    // Registration succeeds regardless of whether the verification email
    // actually sends — a Resend outage or bad address shouldn't turn a
    // successful account creation into a failed signup response (which
    // would also make the client retry into "email already exists"). The
    // account just stays unverified until the user hits "resend
    // verification" from the AppShell banner.
    await this.sendVerificationEmail(user).catch((err) => console.error("Failed to send verification email on register", err));
    // Separate from the verification email above (see EmailService's doc
    // comment) — same "never let an email failure break signup" swallowed
    // catch as everywhere else in this file.
    await this.emailService
      .sendWelcomeEmail(user.email, user.name, `${this.clientOrigin.replace(/\/$/, "")}/dashboard`)
      .catch((err) => console.error("Failed to send welcome email on register", err));
    return { user, token };
  }

  /** Generates and emails a fresh verification link, overwriting any earlier pending one. Shared by register() and resendVerificationEmail(). */
  private async sendVerificationEmail(user: User): Promise<void> {
    const token = generateRandomToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString();
    await this.users.setVerificationToken(user.id, tokenHash, expiresAt);
    const verifyUrl = `${this.clientOrigin.replace(/\/$/, "")}/verify-email?token=${token}`;
    await this.emailService.sendVerificationEmail(user.email, verifyUrl);
  }

  /**
   * Logged-in-only resend (see AppShell's "verify your email" banner) — no
   * email-address parameter, so there's no account-enumeration surface here
   * the way requestPasswordReset needs to guard against. No-ops silently if
   * already verified.
   *
   * Send failures are caught and logged rather than thrown, same as
   * register()/updateProfile() — a Resend-side problem (bad address, sandbox
   * domain restrictions, an outage) shouldn't surface as a raw internal
   * error message in the banner's UI. The banner still reports "sent"
   * either way; the real failure is only visible server-side (wrangler
   * tail), which is the tradeoff of not wanting to leak Resend's own error
   * text to end users.
   */
  async resendVerificationEmail(userId: string): Promise<void> {
    const record = await this.users.findById(userId);
    if (!record || record.emailVerified) return;
    await this.sendVerificationEmail(new User(record)).catch((err) =>
      console.error("Failed to send verification email on resend", err)
    );
  }

  /** Consumes a verification token — one-time use, since confirmEmailVerification() clears it on the same write that flips emailVerified. */
  async verifyEmail(token: string): Promise<void> {
    const tokenHash = await sha256Hex(token);
    const record = await this.users.findByVerificationTokenHash(tokenHash);
    if (!record || !record.verificationTokenExpiresAt || new Date(record.verificationTokenExpiresAt).getTime() < Date.now()) {
      throw new InvalidVerificationTokenError("This verification link is invalid or has expired.");
    }
    await this.users.confirmEmailVerification(record.id);
  }

  async login(email: string, password: string) {
    const record = await this.users.findByEmail(email);
    if (!record) throw new AuthError("Invalid email or password.");

    const matches = await bcrypt.compare(password, record.passwordHash);
    if (!matches) throw new AuthError("Invalid email or password.");

    if (record.suspended) throw new AuthError("This account has been suspended. Contact support at support@resumelingo.com for help.");

    const user = new User(record);
    const token = await this.tokens.sign({ userId: user.id, email: user.email });
    return { user, token };
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const record = await this.users.findById(userId);
    return record ? new User(record) : undefined;
  }

  verifyToken(token: string) {
    return this.tokens.verify(token);
  }

  /**
   * Updates name/email/profession. Rejects an email change if another
   * account already uses it. Changing the email flips emailVerified back to
   * false and sends a fresh verification link to the new address — the old
   * address's prior verification doesn't carry over to a different address
   * the account hasn't proven it controls yet.
   *
   * Blocks a suspended account the same way login() does — this route is
   * behind requireAuth, so an already-issued JWT (from before the account
   * was suspended, or a compromised session an admin suspended in response
   * to) would otherwise still be able to change the email on file, which
   * could let whoever holds that session keep control of the account past
   * suspension (e.g. if it's later reinstated). Doesn't need the "resolve
   * silently" treatment requestPasswordReset() uses — this is an
   * authenticated call, not a public one, so there's no account-enumeration
   * concern in just saying why it was rejected.
   */
  async updateProfile(
    userId: string,
    input: { name?: string; email?: string; profession?: string | null }
  ): Promise<User> {
    const current = await this.users.findById(userId);
    if (!current) throw new AuthError("User not found.");
    if (current.suspended) throw new AuthError("This account has been suspended. Contact support at support@resumelingo.com for help.");

    let email: string | undefined;
    let emailChanged = false;
    if (input.email) {
      email = normalizeEmail(input.email);
      if (!isValidEmail(email)) throw new AuthError("Please enter a valid email address.");
      if (email !== current.email) {
        const existing = await this.users.findByEmail(email);
        if (existing && existing.id !== userId) {
          throw new AuthError("An account with that email already exists.");
        }
        emailChanged = true;
      }
    }

    await this.users.update(userId, { ...input, email });
    if (emailChanged) {
      await this.users.setEmailUnverified(userId);
    }
    const record = await this.users.findById(userId);
    const user = new User(record!);
    if (emailChanged) {
      await this.sendVerificationEmail(user).catch((err) =>
        console.error("Failed to send verification email on email change", err)
      );
    }
    return user;
  }

  /** Requires the current password to confirm identity before setting a new one. */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const record = await this.users.findById(userId);
    if (!record) throw new AuthError("User not found.");

    const matches = await bcrypt.compare(currentPassword, record.passwordHash);
    if (!matches) throw new AuthError("Current password is incorrect.");

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.users.updatePasswordHash(userId, passwordHash);
  }

  /**
   * Always resolves silently, whether or not the email belongs to an
   * account — the response can't reveal which emails are registered, or
   * this becomes an account-enumeration oracle. If the email does match a
   * user, stores a fresh reset token (overwriting any earlier one) and
   * emails a reset link via Resend.
   *
   * The send itself is wrapped in a swallowed `.catch()`, same as every
   * other Resend call site in this file (see sendVerificationEmail's
   * callers) — EmailService.send() throws a plain Error on a non-ok Resend
   * response, and without this catch that throw would escape *after* the
   * reset token is already stored, turning a registered-but-unsendable
   * address into a 500 instead of the usual silent 200. That discrepancy
   * would let an attacker distinguish real accounts from fake ones by
   * Resend send failures alone — the exact oracle this method's "always
   * resolves silently" contract exists to prevent.
   *
   * A suspended account is treated the same as a non-existent one here —
   * `return` early, no token generated, no email sent — rather than
   * throwing: throwing would both break the "always resolves silently"
   * contract (letting an attacker distinguish suspended from unregistered
   * addresses by response shape) and let a suspended user's account (or
   * whoever compromised it, if that's why it's suspended) generate a valid
   * reset token that becomes usable the moment the suspension is lifted.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const record = await this.users.findByEmail(email);
    if (!record || record.suspended) return;

    const token = generateRandomToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
    await this.users.setResetToken(record.id, tokenHash, expiresAt);

    const resetUrl = `${this.clientOrigin.replace(/\/$/, "")}/reset-password?token=${token}`;
    await this.emailService
      .sendPasswordResetEmail(record.email, resetUrl)
      .catch((err) => console.error("Failed to send password reset email", err));
  }

  /** Settings-page toggle for the weekly view digest — see UserRepository.setViewDigestOptOut. */
  async setViewDigestOptOut(userId: string, optOut: boolean): Promise<User> {
    await this.users.setViewDigestOptOut(userId, optOut);
    const record = await this.users.findById(userId);
    if (!record) throw new AuthError("User not found.");
    return new User(record);
  }

  /** Consumes a reset token — one-time use, since resetPassword() clears it on the same write that sets the new password. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = await sha256Hex(token);
    const record = await this.users.findByResetTokenHash(tokenHash);
    if (!record || !record.resetTokenExpiresAt || new Date(record.resetTokenExpiresAt).getTime() < Date.now()) {
      throw new InvalidResetTokenError("This reset link is invalid or has expired.");
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.users.resetPassword(record.id, passwordHash);
  }
}
