import { SubscriptionPlanDefinition, SubscriptionTier } from "../types";

export const SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
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
      "Job application tracker",
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
      "Branded resume link",
      "Resume analytics",
      "Interview preparation",
      "Career coaching resources",
      "ATS optimization",
      "AI cover letters & thank-you letters",
      "AI Career Coach",
    ],
  },
];

export function getPlan(tier: SubscriptionTier): SubscriptionPlanDefinition {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === tier);
  if (!plan) throw new Error(`Unknown subscription tier: ${tier}`);
  return plan;
}
