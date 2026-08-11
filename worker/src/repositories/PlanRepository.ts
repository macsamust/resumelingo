import { PlanRecord, SubscriptionTier } from "../types";

export interface UpdatePlanInput {
  name?: string;
  priceMonthly?: number;
  resumeLimit?: number;
  features?: string[];
}

/**
 * CRUD for the "plans" table — deliberately update-only (no create/delete):
 * the three tiers (starter/professional/premium) are fixed by
 * SubscriptionTier, so an admin can edit a plan's displayed details but not
 * add or remove tiers. Same "read through to D1 every call" reasoning as
 * TemplateRepository — no in-memory cache, unlike server/'s version.
 */
export class PlanRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(): Promise<PlanRecord[]> {
    const { results } = await this.db.prepare(`SELECT * FROM plans`).all<PlanRecord>();
    return results;
  }

  async findByTier(tier: SubscriptionTier): Promise<PlanRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM plans WHERE "tier" = ?`).bind(tier).first<PlanRecord>();
    return row ?? undefined;
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
    await this.db
      .prepare(`UPDATE plans SET name = ?, priceMonthly = ?, resumeLimit = ?, features = ?, updatedAt = ? WHERE "tier" = ?`)
      .bind(merged.name, merged.priceMonthly, merged.resumeLimit, merged.features, merged.updatedAt, tier)
      .run();
    return merged;
  }
}
