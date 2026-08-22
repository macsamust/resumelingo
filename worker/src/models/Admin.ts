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

  constructor(record: AdminRecord) {
    this.id = record.id;
    this.name = record.name;
    this.email = record.email;
    this.passwordHash = record.passwordHash;
    this.createdAt = record.createdAt;
    this.failedLoginAttempts = record.failedLoginAttempts;
    this.lockedUntil = record.lockedUntil;
  }

  toPublicJSON() {
    return { id: this.id, name: this.name, email: this.email, createdAt: this.createdAt };
  }
}
