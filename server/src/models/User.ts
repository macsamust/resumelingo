import { SubscriptionTier, UserRecord } from "../types";
import { getPlan } from "../config/subscriptionPlans";

/**
 * Domain model wrapping a raw user row with behavior. Repositories return
 * plain records; services wrap them in this class when business rules
 * (e.g. "can this user create another resume?") need to be evaluated.
 */
export class User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly profession: string | null;
  readonly subscriptionTier: SubscriptionTier;
  readonly stripeCustomerId: string | null;
  readonly stripeSubscriptionId: string | null;
  readonly suspended: boolean;
  readonly createdAt: string;

  constructor(record: UserRecord) {
    this.id = record.id;
    this.name = record.name;
    this.email = record.email;
    this.passwordHash = record.passwordHash;
    this.profession = record.profession;
    this.subscriptionTier = record.subscriptionTier;
    this.stripeCustomerId = record.stripeCustomerId ?? null;
    this.stripeSubscriptionId = record.stripeSubscriptionId ?? null;
    this.suspended = record.suspended;
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
