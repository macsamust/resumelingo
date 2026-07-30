import { UserRepository } from "../repositories/UserRepository";
import { SUBSCRIPTION_PLANS, getPlan } from "../config/subscriptionPlans";
import { SubscriptionTier } from "../types";
import { User } from "../models/User";

export class SubscriptionService {
  constructor(private readonly users: UserRepository = new UserRepository()) {}

  listPlans() {
    return SUBSCRIPTION_PLANS;
  }

  changeTier(userId: string, tier: SubscriptionTier): User {
    getPlan(tier); // throws if invalid tier
    this.users.updateSubscriptionTier(userId, tier);
    const record = this.users.findById(userId)!;
    return new User(record);
  }

  usageFor(user: User) {
    const used = this.users.countResumesForUser(user.id);
    const limit = user.plan.resumeLimit;
    return {
      tier: user.subscriptionTier,
      planName: user.plan.name,
      resumesUsed: used,
      resumeLimit: limit,
      unlimited: limit === -1,
      remaining: limit === -1 ? null : Math.max(limit - used, 0),
    };
  }
}
