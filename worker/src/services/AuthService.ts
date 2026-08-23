import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/UserRepository";
import { TokenService } from "./TokenService";
import { EmailService } from "./EmailService";
import { User } from "../models/User";
import { AuthTokenPayload } from "../types";

export class AuthError extends Error {}

/** Thrown when a password-reset token is missing, doesn't match any user, or has expired — mapped to 400 in index.ts's onError. */
export class InvalidResetTokenError extends Error {}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Random 32-byte hex token — the value that goes in the email link. */
function generateResetToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Only this hash is ever stored — same principle as password hashing,
 * except SHA-256 (not bcrypt) is fine here since the input is already a
 * high-entropy random token, not a low-entropy human password.
 */
async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new AuthError("An account with that email already exists.");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const record = await this.users.create({
      name: input.name,
      email: input.email,
      passwordHash,
      profession: input.profession ?? null,
    });
    const user = new User(record);
    const token = await this.tokens.sign({ userId: user.id, email: user.email });
    return { user, token };
  }

  async login(email: string, password: string) {
    const record = await this.users.findByEmail(email);
    if (!record) throw new AuthError("Invalid email or password.");

    const matches = await bcrypt.compare(password, record.passwordHash);
    if (!matches) throw new AuthError("Invalid email or password.");

    if (record.suspended) throw new AuthError("This account has been suspended. Contact support for help.");

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

  /** Updates name/email/profession. Rejects an email change if another account already uses it. */
  async updateProfile(
    userId: string,
    input: { name?: string; email?: string; profession?: string | null }
  ): Promise<User> {
    if (input.email) {
      const existing = await this.users.findByEmail(input.email);
      if (existing && existing.id !== userId) {
        throw new AuthError("An account with that email already exists.");
      }
    }
    await this.users.update(userId, input);
    const record = await this.users.findById(userId);
    return new User(record!);
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
   */
  async requestPasswordReset(email: string): Promise<void> {
    const record = await this.users.findByEmail(email);
    if (!record) return;

    const token = generateResetToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
    await this.users.setResetToken(record.id, tokenHash, expiresAt);

    const resetUrl = `${this.clientOrigin.replace(/\/$/, "")}/reset-password?token=${token}`;
    await this.emailService.sendPasswordResetEmail(record.email, resetUrl);
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
