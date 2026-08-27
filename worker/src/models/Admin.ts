import { AdminRecord } from "../types";

/** Domain model for an admin account — deliberately separate from User (see types/index.ts AdminRecord). */
export class Admin {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly createdAt: string;
  readonly failedLoginAttempts: number;
  readonly lockedUntil: string | null;
  readonly tokenVersion: number;
  readonly totpSecret: string | null;
  readonly totpEnabled: boolean;
  /** Parsed from the record's JSON-serialized column — see AdminRecord.totpBackupCodeHashes. */
  readonly totpBackupCodeHashes: string[];

  constructor(record: AdminRecord) {
    this.id = record.id;
    this.name = record.name;
    this.email = record.email;
    this.passwordHash = record.passwordHash;
    this.createdAt = record.createdAt;
    this.failedLoginAttempts = record.failedLoginAttempts;
    this.lockedUntil = record.lockedUntil;
    this.tokenVersion = record.tokenVersion;
    this.totpSecret = record.totpSecret;
    this.totpEnabled = record.totpEnabled;
    this.totpBackupCodeHashes = record.totpBackupCodeHashes ? JSON.parse(record.totpBackupCodeHashes) : [];
  }

  /** Never includes passwordHash, totpSecret, or totpBackupCodeHashes — totpEnabled (just the boolean) is the only 2FA-related field a client ever sees. */
  toPublicJSON() {
    return { id: this.id, name: this.name, email: this.email, createdAt: this.createdAt, totpEnabled: this.totpEnabled };
  }
}
