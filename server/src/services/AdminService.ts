import bcrypt from "bcryptjs";
import { AdminRepository } from "../repositories/AdminRepository";
import { TokenService } from "./TokenService";
import { Admin } from "../models/Admin";
import { AdminTokenPayload } from "../types";

export class AdminAuthError extends Error {}

/**
 * Mirrors AuthService's shape, but is a fully separate auth system — its
 * own table (admins), its own JWT secret (ADMIN_JWT_SECRET, falling back to
 * JWT_SECRET only if unset), its own token payload shape (AdminTokenPayload)
 * — so a leaked/forged user token can never be used as an admin token, and
 * vice versa. There is no admin self-registration; the first admin account
 * is created automatically at boot from ADMIN_EMAIL/ADMIN_PASSWORD env vars
 * (see ensureBootstrapAdmin, called from index.ts) if no admin exists yet.
 */
export class AdminService {
  constructor(
    private readonly admins: AdminRepository = new AdminRepository(),
    private readonly tokens: TokenService<AdminTokenPayload> = new TokenService<AdminTokenPayload>(
      process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "dev-admin-secret"
    )
  ) {}

  async login(email: string, password: string) {
    const record = await this.admins.findByEmail(email);
    if (!record) throw new AdminAuthError("Invalid email or password.");

    const matches = await bcrypt.compare(password, record.passwordHash);
    if (!matches) throw new AdminAuthError("Invalid email or password.");

    const admin = new Admin(record);
    const token = this.tokens.sign({ adminId: admin.id, email: admin.email });
    return { admin, token };
  }

  async getAdminById(adminId: string): Promise<Admin | undefined> {
    const record = await this.admins.findById(adminId);
    return record ? new Admin(record) : undefined;
  }

  verifyToken(token: string): AdminTokenPayload {
    return this.tokens.verify(token);
  }

  /**
   * Creates the first admin account from ADMIN_EMAIL/ADMIN_PASSWORD env vars
   * if no admin exists yet. A no-op once at least one admin account exists,
   * so it's safe to call on every boot (see index.ts).
   */
  async ensureBootstrapAdmin(): Promise<void> {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;

    const existingCount = await this.admins.count();
    if (existingCount > 0) return;

    const passwordHash = await bcrypt.hash(password, 10);
    await this.admins.create({ name: "Admin", email, passwordHash });
    console.log(`Bootstrap admin account created: ${email}`);
  }
}
