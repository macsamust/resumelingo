import { PlanRecord, SubscriptionPlanDefinition, SubscriptionTier } from "../types";

/**
 * Seed data only, used once (see db/database.ts's seedCatalogDefaults) to
 * populate the "plans" table the first time an install boots. Once seeded,
 * the DB table is the source of truth for name/price/resumeLimit/features;
 * admins edit plans via /api/admin/plans (see repositories/PlanRepository.ts).
 * stripePriceId is NOT part of the DB row — it's merged in from env vars
 * every time the cache refreshes (see refreshFromRecords below), so editing
 * a plan's displayed price here never silently changes what Stripe charges.
 */
export const DEFAULT_PLANS: SubscriptionPlanDefinition[] = [
  {
    tier: SubscriptionTier.Starter,
    name: "Starter",
    priceMonthly: 0,
    resumeLimit: 1,
    features: ["One resume", "Basic template", "PDF download", "Public link", "Limited edits", "Basic tips"],
  },
  {
    tier: SubscriptionTier.Professional,
    name: "Professional",
    priceMonthly: 9.99,
    resumeLimit: 3,
    features: [
      "Three resumes",
      "Unlimited edits",
      "Template library",
      "Private sharing",
      "Analytics",
      "Resume scoring",
      "Career Center",
      "AI assistance",
    ],
  },
  {
    tier: SubscriptionTier.Premium,
    name: "Premium",
    priceMonthly: 19.99,
    resumeLimit: -1,
    features: [
      "Everything in Professional",
      "Unlimited resumes",
      "Premium templates",
      "Custom domain",
      "Resume analytics",
      "Interview preparation",
      "Career coaching resources",
      "ATS optimization",
      "AI cover letters & thank-you letters",
      "Portfolio pages & personal branding tools",
    ],
  },
];

function stripePriceIdFor(tier: SubscriptionTier): string | undefined {
  if (tier === SubscriptionTier.Professional) return process.env.STRIPE_PRICE_PROFESSIONAL;
  if (tier === SubscriptionTier.Premium) return process.env.STRIPE_PRICE_PREMIUM;
  return undefined;
}

/** In-memory cache, populated at boot (see index.ts) and refreshed after every admin write (see repositories/PlanRepository.ts). Synchronous for the same reason as config/templates.ts's cache — User.ts's `plan` getter is called synchronously in tight loops. */
let cache: SubscriptionPlanDefinition[] = DEFAULT_PLANS;

export function setPlanCache(records: PlanRecord[]): void {
  cache = records.map((r) => ({
    tier: r.tier,
    name: r.name,
    priceMonthly: r.priceMonthly,
    resumeLimit: r.resumeLimit,
    features: JSON.parse(r.features || "[]"),
    stripePriceId: stripePriceIdFor(r.tier),
  }));
}

export function listPlans(): SubscriptionPlanDefinition[] {
  return cache;
}

export function getPlan(tier: SubscriptionTier): SubscriptionPlanDefinition {
  const plan = cache.find((p) => p.tier === tier);
  if (!plan) throw new Error(`Unknown subscription tier: ${tier}`);
  return plan;
}
