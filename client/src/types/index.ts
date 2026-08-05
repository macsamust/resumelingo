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

/** One job in a resume's work history. Dates are "YYYY-MM" (from an <input type="month">). */
export interface WorkExperienceEntry {
  company: string;
  title: string;
  startDate: string;
  endDate: string | null; // null when `current` is true
  current: boolean;
}

/** One school in a resume's education history. Dates are "YYYY-MM" (from an <input type="month">). */
export interface EducationEntry {
  school: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string | null; // null when `current` is true
  current: boolean;
}

/** One award/honor. `date` is "YYYY-MM" (from an <input type="month">). */
export interface AwardEntry {
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

/**
 * One achievement described with the STAR/CAR method (Challenge, Action,
 * Result) — see ExperienceEditor's sibling AchievementEditor.tsx. The
 * server turns each of these into one impact-focused resume bullet.
 */
export interface AchievementEntry {
  challenge: string;
  action: string;
  result: string;
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
  fullName: string;
  title: string;
  profession: string;
  professionLabel: string;
  templateKey: string;
  template?: TemplateDefinition;
  visibility: LinkVisibility;
  hasPassword: boolean;
  answers: Record<string, string>;
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  awards: AwardEntry[];
  achievements: AchievementEntry[];
  generatedSummary: string;
  generatedBullets: string[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicResume {
  fullName: string;
  title: string;
  professionLabel: string;
  templateKey: string;
  template?: TemplateDefinition;
  answers: Record<string, string>;
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  awards: AwardEntry[];
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
