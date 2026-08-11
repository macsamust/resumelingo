import bcrypt from "bcryptjs";
import { AdminRepository } from "../repositories/AdminRepository";
import { TokenService } from "./TokenService";
import { Admin } from "../models/Admin";
import { AdminTokenPayload } from "../types";

export class AdminAuthError extends Error {}

/**
 * Mirrors server/'s AdminService, but is a fully separate auth system from
 * AuthService — its own table (admins), its own JWT secret
 * (ADMIN_JWT_SECRET, falling back to JWT_SECRET only if unset), its own
 * token payload shape (AdminTokenPayload) — so a leaked/forged user token
 * can never be used as an admin token, and vice versa.
 *
 * Bootstrap admin creation deviates from server/'s design: server/ calls
 * ensureBootstrapAdmin() once at process boot (see server/src/index.ts).
 * Workers have no boot hook — every request starts a fresh isolate with no
 * "first request ever" signal — so instead this lazily checks-and-creates
 * on every login attempt (see login() below), which is a no-op cheaper than
 * a boot hook once at least one admin exists (a single COUNT(*) query) and
 * naturally self-heals a fresh D1 database that hasn't been seeded yet, as
 * long as ADMIN_EMAIL/ADMIN_PASSWORD are configured as Worker secrets. In
 * practice this is a secondary concern for this deploy: the real admin
 * account already exists in D1 via the one-time Postgres migration (see
 * migrations/seed-accounts.sql), so this bootstrap path mainly matters for
 * a from-scratch D1 instance.
 */
export class AdminService {
  constructor(
    private readonly admins: AdminRepository,
    private readonly tokens: TokenService<AdminTokenPayload>,
    private readonly bootstrapEmail?: string,
    private readonly bootstrapPassword?: string
  ) {}

  async login(email: string, password: string) {
    await this.ensureBootstrapAdmin();

    const record = await this.admins.findByEmail(email);
    if (!record) throw new AdminAuthError("Invalid email or password.");

    const matches = await bcrypt.compare(password, record.passwordHash);
    if (!matches) throw new AdminAuthError("Invalid email or password.");

    const admin = new Admin(record);
    const token = await this.tokens.sign({ adminId: admin.id, email: admin.email });
    return { admin, token };
  }

  async getAdminById(adminId: string): Promise<Admin | undefined> {
    const record = await this.admins.findById(adminId);
    return record ? new Admin(record) : undefined;
  }

  async verifyToken(token: string): Promise<AdminTokenPayload> {
    return this.tokens.verify(token);
  }

  /**
   * Creates the first admin account from ADMIN_EMAIL/ADMIN_PASSWORD Worker
   * secrets if no admin exists yet. A no-op once at least one admin account
   * exists, or if those secrets aren't configured — see class doc comment
   * above for why this runs lazily instead of at boot.
   */
  async ensureBootstrapAdmin(): Promise<void> {
    if (!this.bootstrapEmail || !this.bootstrapPassword) return;

    const existingCount = await this.admins.count();
    if (existingCount > 0) return;

    const passwordHash = await bcrypt.hash(this.bootstrapPassword, 10);
    await this.admins.create({ name: "Admin", email: this.bootstrapEmail, passwordHash });
  }
}
