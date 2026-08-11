import { SubscriptionTier, UserRecord } from "../types";
import { getPlan } from "../config/subscriptionPlans";

/**
 * Domain model wrapping a raw user row with behavior. Identical to the
 * Node/Express version — it never touches the database directly, so
 * nothing here changes for D1.
 */
export class User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly profession: string | null;
  readonly subscriptionTier: SubscriptionTier;
  readonly suspended: boolean;
  readonly stripeCustomerId: string | null;
  readonly stripeSubscriptionId: string | null;
  readonly createdAt: string;

  constructor(record: UserRecord) {
    this.id = record.id;
    this.name = record.name;
    this.email = record.email;
    this.passwordHash = record.passwordHash;
    this.profession = record.profession;
    this.subscriptionTier = record.subscriptionTier;
    this.suspended = record.suspended;
    this.stripeCustomerId = record.stripeCustomerId;
    this.stripeSubscriptionId = record.stripeSubscriptionId;
    this.createdAt = record.createdAt;
  }

  get plan() {
    return getPlan(this.subscriptionTier);
  }

  canCreateAdditionalResume(currentResumeCount: number): boolean {
    const limit = this.plan.resumeLimit;
    if (limit === -1) return true;
    return currentResumeCount < limit;
  }

  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      profession: this.profession,
      subscriptionTier: this.subscriptionTier,
      plan: this.plan,
      createdAt: this.createdAt,
    };
  }
}
