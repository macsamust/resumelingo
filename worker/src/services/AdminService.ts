import bcrypt from "bcryptjs";
import { AdminRepository } from "../repositories/AdminRepository";
import { TokenService } from "./TokenService";
import { Admin } from "../models/Admin";
import { AdminRecord, AdminTokenPayload } from "../types";
import { buildOtpAuthUri, generateBackupCode, generateTotpSecret, verifyTotp } from "../utils/totp";
import { sha256Hex } from "../utils/crypto";

export class AdminAuthError extends Error {}

/** Thrown by login() when the password is correct but the account has 2FA enabled and no code (or an invalid one) was given — a distinct error from AdminAuthError so the controller can prompt for a code instead of showing "invalid credentials" (see AdminAuthController.login's reason: "totp_required"). */
export class TotpRequiredError extends Error {}

/** How many one-time backup codes are generated at enrollment — enough to comfortably cover a handful of "lost my phone" incidents before needing to regenerate, without the list becoming unwieldy to store/print. */
const BACKUP_CODE_COUNT = 8;

/** After this many consecutive wrong passwords, the account is locked out for LOCKOUT_MINUTES. */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

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

  /**
   * `totpCode` is optional on the type only so a non-2FA account's login
   * doesn't need to pass anything new — for a 2FA-enabled account, a
   * missing or wrong code throws TotpRequiredError/AdminAuthError same as
   * before. See AdminAuthController.login for how the two-step client flow
   * (password first, then prompt for a code) is built on top of this.
   */
  async login(email: string, password: string, totpCode?: string) {
    await this.ensureBootstrapAdmin();

    const record = await this.admins.findByEmail(email);
    if (!record) throw new AdminAuthError("Invalid email or password.");

    if (record.lockedUntil && new Date(record.lockedUntil) > new Date()) {
      const minutesLeft = Math.max(1, Math.ceil((new Date(record.lockedUntil).getTime() - Date.now()) / 60000));
      throw new AdminAuthError(`Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`);
    }

    const matches = await bcrypt.compare(password, record.passwordHash);
    if (!matches) {
      await this.recordFailure(record);
      throw new AdminAuthError("Invalid email or password.");
    }

    // Password is correct at this point — 2FA (if enabled) is checked as a
    // separate step so a wrong password and a wrong/missing 2FA code can
    // give the client different, actionable responses (see
    // AdminAuthController.login's "totp_required" reason) instead of both
    // collapsing into one generic "invalid credentials" message.
    let workingRecord = record;
    if (record.totpEnabled) {
      if (!totpCode) throw new TotpRequiredError("Two factor code required.");
      const result = await this.verifyTotpOrBackupCode(record, totpCode);
      if (!result.valid) {
        // A wrong 2FA code counts toward the same lockout as a wrong
        // password — a 6-digit TOTP code has too small a space (1 in a
        // million) to leave completely unthrottled.
        await this.recordFailure(record);
        throw new AdminAuthError("Invalid two factor code.");
      }
      if (result.consumedBackupCode) workingRecord = { ...record, totpBackupCodeHashes: JSON.stringify(result.remainingBackupCodeHashes) };
    }

    if (record.failedLoginAttempts > 0 || record.lockedUntil) {
      await this.admins.recordLoginSuccess(record.id);
    }

    const admin = new Admin(workingRecord);
    const token = await this.tokens.sign({ adminId: admin.id, email: admin.email, tokenVersion: admin.tokenVersion });
    return { admin, token };
  }

  private async recordFailure(record: AdminRecord): Promise<void> {
    const failedLoginAttempts = record.failedLoginAttempts + 1;
    const lockedUntil = failedLoginAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString() : null;
    await this.admins.recordLoginFailure(record.id, lockedUntil ? 0 : failedLoginAttempts, lockedUntil);
    if (lockedUntil) {
      throw new AdminAuthError(`Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`);
    }
  }

  /**
   * Checks a login-time code against the TOTP secret first, then against
   * any unused backup code hash — a match there is consumed (removed from
   * the stored list) on the spot, since each is one-time-use. Returns the
   * updated backup-code list so login() can build an in-memory Admin
   * reflecting the consumption without a second DB read; the actual
   * persistence happens here via setBackupCodeHashes.
   */
  private async verifyTotpOrBackupCode(
    record: AdminRecord,
    code: string
  ): Promise<{ valid: boolean; consumedBackupCode?: boolean; remainingBackupCodeHashes?: string[] }> {
    if (record.totpSecret && (await verifyTotp(record.totpSecret, code))) {
      return { valid: true };
    }
    const codeHash = await sha256Hex(code.trim());
    const backupHashes: string[] = JSON.parse(record.totpBackupCodeHashes || "[]");
    const index = backupHashes.indexOf(codeHash);
    if (index === -1) return { valid: false };

    const remaining = backupHashes.filter((_, i) => i !== index);
    await this.admins.setBackupCodeHashes(record.id, remaining);
    return { valid: true, consumedBackupCode: true, remainingBackupCodeHashes: remaining };
  }

  /**
   * Step 1 of enrollment — generates a fresh secret and stores it
   * (unconfirmed, totpEnabled stays false) so confirmTotpEnrollment can
   * verify against it. Returns both the raw secret (for manual entry) and
   * an otpauth:// URI (for a QR code / "add account" import) — the admin
   * console page renders both.
   */
  async beginTotpEnrollment(adminId: string): Promise<{ secret: string; otpauthUri: string }> {
    const record = await this.admins.findById(adminId);
    if (!record) throw new AdminAuthError("Admin not found.");
    const secret = generateTotpSecret();
    await this.admins.setPendingTotpSecret(adminId, secret);
    return { secret, otpauthUri: buildOtpAuthUri(secret, record.email) };
  }

  /**
   * Step 2 — the admin enters a code from their authenticator app to prove
   * they scanned/entered the secret correctly. Only on a valid code does
   * this actually flip totpEnabled on and generate the one-time backup
   * codes (returned in plaintext exactly once — only their hashes are
   * ever stored, see AdminRecord.totpBackupCodeHashes).
   */
  async confirmTotpEnrollment(adminId: string, code: string): Promise<string[]> {
    const record = await this.admins.findById(adminId);
    if (!record?.totpSecret) throw new AdminAuthError("No pending two factor enrollment for this account.");
    if (!(await verifyTotp(record.totpSecret, code))) {
      throw new AdminAuthError("That code didn't match. Check your authenticator app and try again.");
    }
    const backupCodes = Array.from({ length: BACKUP_CODE_COUNT }, () => generateBackupCode());
    const backupCodeHashes = await Promise.all(backupCodes.map((c) => sha256Hex(c)));
    await this.admins.confirmTotpEnrollment(adminId, backupCodeHashes);
    return backupCodes;
  }

  /** Requires the current password again — same "prove you're really you" gate as User-side changePassword — before turning 2FA off, since disabling it is exactly the kind of action a stolen-but-not-yet-fully-hijacked session shouldn't be able to do unchecked. */
  async disableTotp(adminId: string, password: string): Promise<void> {
    const record = await this.admins.findById(adminId);
    if (!record) throw new AdminAuthError("Admin not found.");
    const matches = await bcrypt.compare(password, record.passwordHash);
    if (!matches) throw new AdminAuthError("Incorrect password.");
    await this.admins.disableTotp(adminId);
  }

  async getAdminById(adminId: string): Promise<Admin | undefined> {
    const record = await this.admins.findById(adminId);
    return record ? new Admin(record) : undefined;
  }

  async verifyToken(token: string): Promise<AdminTokenPayload> {
    return this.tokens.verify(token);
  }

  /**
   * Invalidates every previously-issued JWT for this admin at once — the
   * self-service "log out everywhere" action (see AdminSecurityController),
   * useful if a token might have leaked (lost/stolen device, a session left
   * open somewhere) without needing to change the password too. A stateless
   * JWT has no other way to be revoked early short of waiting out its
   * expiry — see requireAdminAuth's tokenVersion check.
   */
  async revokeSessions(adminId: string): Promise<void> {
    await this.admins.bumpTokenVersion(adminId);
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
