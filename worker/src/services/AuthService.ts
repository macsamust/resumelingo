import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/UserRepository";
import { TokenService } from "./TokenService";
import { User } from "../models/User";
import { AuthTokenPayload } from "../types";

export class AuthError extends Error {}

/**
 * Same responsibilities as the Node/Express AuthService, including the
 * `suspended` account check in login() — that column backs the admin
 * console's "disable a user's login" action (see AdminUserController /
 * migrations/0004_admin_catalog.sql), ported in Phase 3.
 */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService<AuthTokenPayload>
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
}
