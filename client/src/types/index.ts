export type SubscriptionTier = "starter" | "professional" | "premium";
export type LinkVisibility = "public" | "password" | "private";

export interface ProfessionQuestion {
  key: string;
  label: string;
  type: "text" | "textarea" | "list" | "number";
  placeholder?: string;
}

export interface ProfessionSummary {
  key: string;
  label: string;
}

export interface ProfessionDefinition extends ProfessionSummary {
  questions: ProfessionQuestion[];
}

export interface TemplateDefinition {
  key: string;
  name: string;
  description: string;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  resumeLimit: number;
  features: string[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  profession: string | null;
  subscriptionTier: SubscriptionTier;
  plan: SubscriptionPlan;
  createdAt: string;
}

export interface Resume {
  id: string;
  userId: string;
  slug: string;
  title: string;
  profession: string;
  professionLabel: string;
  templateKey: string;
  template?: TemplateDefinition;
  visibility: LinkVisibility;
  hasPassword: boolean;
  answers: Record<string, string>;
  generatedSummary: string;
  generatedBullets: string[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicResume {
  title: string;
  professionLabel: string;
  templateKey: string;
  template?: TemplateDefinition;
  answers: Record<string, string>;
  generatedSummary: string;
  generatedBullets: string[];
  slug: string;
}

export interface DashboardSummary {
  myResumes: Resume[];
  sharedLinks: { title: string; slug: string; visibility: LinkVisibility }[];
  resumeViews: number;
  profileStrengthScore: number;
  suggestedImprovements: string[];
  subscription: {
    tier: SubscriptionTier;
    planName: string;
    resumesUsed: number;
    resumeLimit: number;
    unlimited: boolean;
    remaining: number | null;
  };
}
