import { SubscriptionTier, TemplateCategory } from "../types";

/** Ranked 1:1 — a subscriber can use any template at or below their tier's rank. */
const TIER_RANK: Record<SubscriptionTier, number> = { starter: 0, professional: 1, premium: 2 };
const CATEGORY_RANK: Record<TemplateCategory, number> = { basic: 0, upgrade: 1, premium: 2 };

/** The cheapest subscription tier that can use a template of this category. */
export const CATEGORY_MIN_TIER: Record<TemplateCategory, SubscriptionTier> = {
  basic: "starter",
  upgrade: "professional",
  premium: "premium",
};

export const TIER_LABEL: Record<SubscriptionTier, string> = {
  starter: "Starter",
  professional: "Professional",
  premium: "Premium",
};

/** Whether a subscriber at `tier` is allowed to select/keep a template categorized as `category`. */
export function canUseTemplate(tier: SubscriptionTier, category: TemplateCategory): boolean {
  return TIER_RANK[tier] >= CATEGORY_RANK[category];
}
