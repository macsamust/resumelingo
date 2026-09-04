import { SubscriptionTier, TemplateCategory } from "../types";

/** Ranked 1:1 — a subscriber can use any template at or below their tier's rank. Exported for other "at or above this tier" checks (e.g. AppShell.tsx's nav minTier filter) so they don't duplicate this ranking. */
export const TIER_RANK: Record<SubscriptionTier, number> = { starter: 0, professional: 1, premium: 2 };
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

/**
 * Which templates render a "Skills & Tools" section (see ResumePreview.tsx,
 * which renders it in whichever spot fits each template's own layout).
 * Deliberately a fixed set of template keys, not "every Premium-category
 * template" — those used to be the same thing, but Federal and Military
 * Transition kept this section when they moved from Premium to Professional
 * (Sep 2026), and Government/Consulting gained it despite being
 * Professional-tier all along. Section *availability* per template and
 * *tier gating* per template are two independent decisions now; don't
 * re-derive one from the other.
 */
const SKILLS_AND_TOOLS_TEMPLATE_KEYS = new Set([
  "government",
  "federal",
  "consulting",
  "military-transition",
  "creative",
  "academic",
  "government-contractor",
  "portrait",
  "designer",
  "monochrome",
  "showcase",
  "framed",
  "emblem",
  "spotlight",
  "boardroom",
  "ats-optimized",
  "profile",
  "ledger",
]);

/** Whether `templateKey`'s layout has a "Skills & Tools" section at all — see SKILLS_AND_TOOLS_TEMPLATE_KEYS. */
export function templateHasSkillsAndTools(templateKey: string | undefined): boolean {
  return !!templateKey && SKILLS_AND_TOOLS_TEMPLATE_KEYS.has(templateKey);
}
