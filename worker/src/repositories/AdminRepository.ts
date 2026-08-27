import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { AdminRecord } from "../types";

/** D1 stores booleans as INTEGER 0/1 — same normalization UserRepository does for `suspended`, needed here now that `totpEnabled` exists. */
function normalizeBooleans(row: AdminRecord): AdminRecord {
  return { ...row, totpEnabled: !!row.totpEnabled };
}

export class AdminRepository extends BaseRepository<AdminRecord> {
  protected readonly table = "admins";

  async findById(id: string): Promise<AdminRecord | undefined> {
    const row = await super.findById(id);
    return row ? normalizeBooleans(row) : undefined;
  }

  async findByEmail(email: string): Promise<AdminRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM admins WHERE email = ?`).bind(email).first<AdminRecord>();
    return row ? normalizeBooleans(row) : undefined;
  }

  async findAll(): Promise<AdminRecord[]> {
    const rows = await super.findAll();
    return rows.map(normalizeBooleans);
  }

  async create(input: { name: string; email: string; passwordHash: string }): Promise<AdminRecord> {
    const record: AdminRecord = {
      id: nanoid(12),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
      failedLoginAttempts: 0,
      lockedUntil: null,
      tokenVersion: 0,
      totpSecret: null,
      totpEnabled: false,
      totpBackupCodeHashes: "[]",
    };
    await this.insertRow(record as unknown as Record<string, unknown>);
    return record;
  }

  async count(): Promise<number> {
    const row = await this.db.prepare(`SELECT COUNT(*) as count FROM admins`).first<{ count: number }>();
    return row?.count ?? 0;
  }

  /** Resets the failed-attempt counter and clears any lockout after a successful login. */
  async recordLoginSuccess(id: string): Promise<void> {
    await this.db
      .prepare(`UPDATE admins SET "failedLoginAttempts" = 0, "lockedUntil" = NULL WHERE id = ?`)
      .bind(id)
      .run();
  }

  /** Persists the incremented attempt count and (once the threshold is hit) the lockout expiry. */
  async recordLoginFailure(id: string, failedLoginAttempts: number, lockedUntil: string | null): Promise<void> {
    await this.db
      .prepare(`UPDATE admins SET "failedLoginAttempts" = ?, "lockedUntil" = ? WHERE id = ?`)
      .bind(failedLoginAttempts, lockedUntil, id)
      .run();
  }

  /** Invalidates every previously-issued JWT for this admin at once — see AdminService.revokeSessions and requireAdminAuth's tokenVersion check. Separate UPDATE + SELECT rather than `RETURNING`, matching every other write in this codebase (D1's `RETURNING` support isn't relied on anywhere else here). */
  async bumpTokenVersion(id: string): Promise<number> {
    await this.db.prepare(`UPDATE admins SET "tokenVersion" = "tokenVersion" + 1 WHERE id = ?`).bind(id).run();
    const row = await this.db.prepare(`SELECT "tokenVersion" FROM admins WHERE id = ?`).bind(id).first<{ tokenVersion: number }>();
    return row?.tokenVersion ?? 0;
  }

  /** Stores a freshly-generated TOTP secret ahead of enrollment confirmation — not yet enabled (see confirmTotpEnrollment) until the admin proves they scanned it correctly. */
  async setPendingTotpSecret(id: string, totpSecret: string): Promise<void> {
    await this.db.prepare(`UPDATE admins SET "totpSecret" = ? WHERE id = ?`).bind(totpSecret, id).run();
  }

  /** Flips totpEnabled on and stores the (hashed) one-time backup codes — the enrollment confirmation step, called once the admin has entered a valid code from their authenticator app. */
  async confirmTotpEnrollment(id: string, backupCodeHashes: string[]): Promise<void> {
    await this.db
      .prepare(`UPDATE admins SET "totpEnabled" = 1, "totpBackupCodeHashes" = ? WHERE id = ?`)
      .bind(JSON.stringify(backupCodeHashes), id)
      .run();
  }

  /** Fully removes 2FA — the secret, the enabled flag, and any unused backup codes. */
  async disableTotp(id: string): Promise<void> {
    await this.db
      .prepare(`UPDATE admins SET "totpEnabled" = 0, "totpSecret" = NULL, "totpBackupCodeHashes" = '[]' WHERE id = ?`)
      .bind(id)
      .run();
  }

  /** Persists the backup-code list with one consumed (removed) after it's used in place of a TOTP code at login. */
  async setBackupCodeHashes(id: string, backupCodeHashes: string[]): Promise<void> {
    await this.db
      .prepare(`UPDATE admins SET "totpBackupCodeHashes" = ? WHERE id = ?`)
      .bind(JSON.stringify(backupCodeHashes), id)
      .run();
  }
}
