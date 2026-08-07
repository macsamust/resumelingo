import { pool } from "../db/database";
import { PlanRecord, SubscriptionTier } from "../types";
import { setPlanCache } from "../config/subscriptionPlans";

export interface UpdatePlanInput {
  name?: string;
  priceMonthly?: number;
  resumeLimit?: number;
  features?: string[];
}

/**
 * CRUD for the "plans" table — deliberately update-only (no create/delete):
 * the three tiers (starter/professional/premium) are fixed by
 * SubscriptionTier and by what's wired into checkout/webhook handling, so
 * an admin can edit a plan's displayed details but not add or remove tiers.
 * Every write refreshes the in-memory cache in config/subscriptionPlans.ts.
 */
export class PlanRepository {
  private readonly pool = pool;

  async findAll(): Promise<PlanRecord[]> {
    const { rows } = await this.pool.query(`SELECT * FROM plans`);
    return rows as PlanRecord[];
  }

  async findByTier(tier: SubscriptionTier): Promise<PlanRecord | undefined> {
    const { rows } = await this.pool.query(`SELECT * FROM plans WHERE "tier" = $1`, [tier]);
    return rows[0] as PlanRecord | undefined;
  }

  async update(tier: SubscriptionTier, input: UpdatePlanInput): Promise<PlanRecord | undefined> {
    const existing = await this.findByTier(tier);
    if (!existing) return undefined;
    const merged: PlanRecord = {
      ...existing,
      name: input.name ?? existing.name,
      priceMonthly: input.priceMonthly ?? existing.priceMonthly,
      resumeLimit: input.resumeLimit ?? existing.resumeLimit,
      features: input.features ? JSON.stringify(input.features) : existing.features,
      updatedAt: new Date().toISOString(),
    };
    await this.pool.query(
      `UPDATE plans SET "name" = $1, "priceMonthly" = $2, "resumeLimit" = $3, "features" = $4, "updatedAt" = $5 WHERE "tier" = $6`,
      [merged.name, merged.priceMonthly, merged.resumeLimit, merged.features, merged.updatedAt, tier]
    );
    await this.refreshCache();
    return merged;
  }

  async refreshCache(): Promise<void> {
    setPlanCache(await this.findAll());
  }
}
