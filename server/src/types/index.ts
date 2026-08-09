export enum SubscriptionTier {
  Starter = "starter",
  Professional = "professional",
  Premium = "premium",
}

export enum LinkVisibility {
  Public = "public",
  PasswordProtected = "password",
  Private = "private",
}

/**
 * Which subscription tier a template requires. Ranked 1:1 with
 * SubscriptionTier (basic=Starter, upgrade=Professional, premium=Premium)
 * — see config/templates.ts's canUseTemplate() for the comparison.
 */
export enum TemplateCategory {
  Basic = "basic",
  Upgrade = "upgrade",
  Premium = "premium",
}

export interface ProfessionQuestion {
  key: string;
  label: string;
  type: "text" | "textarea" | "list" | "number";
  placeholder?: string;
}

export interface ProfessionDefinition {
  key: string;
  label: string;
  questions: ProfessionQuestion[];
}

export interface TemplateDefinition {
  key: string;
  name: string;
  description: string;
  category: TemplateCategory;
}

export interface SubscriptionPlanDefinition {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  resumeLimit: number; // -1 = unlimited
  features: string[];
  stripePriceId?: string; // undefined for the free Starter tier
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  profession: string | null;
  subscriptionTier: SubscriptionTier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  suspended: boolean;
  createdAt: string;
}

/**
 * Admin accounts are a deliberately separate role/auth system from regular
 * users (see services/AdminService.ts) — their own table, own JWT secret,
 * own login route — rather than an isAdmin flag on the users table, so a
 * compromised user token can never be replayed as an admin token.
 */
export interface AdminRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

/** DB-backed template row (see repositories/TemplateRepository.ts). `enabled` controls whether it's offered to users; disabled templates stay selectable by resumes that already used them. */
export interface TemplateRecord {
  key: string;
  name: string;
  description: string;
  category: TemplateCategory;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * DB-backed subscription plan row (see repositories/PlanRepository.ts).
 * Deliberately does NOT store stripePriceId — that stays sourced from
 * STRIPE_PRICE_* env vars (see config/subscriptionPlans.ts) so editing a
 * plan's price here changes what's *displayed*, not what Stripe actually
 * charges, which must still be changed in the Stripe dashboard.
 */
export interface PlanRecord {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  resumeLimit: number;
  features: string; // JSON-serialized string[]
  updatedAt: string;
}

/** One job in a resume's work history. Dates are "YYYY-MM" (from an <input type="month">). */
export interface WorkExperienceEntry {
  /** Stable client-generated id — lets an achievement link to a specific job via AchievementEntry.experienceId. */
  id?: string;
  company: string;
  title: string;
  city?: string;
  state?: string;
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
 * One achievement described with the STAR/CAR method: what problem existed
 * (challenge), what the person did about it (action), and what changed as a
 * result (result). ContentGenerator.ts turns each of these into one
 * impact-focused resume bullet instead of the generic "leveraged X" bullets
 * built from raw profession Q&A answers.
 */
export interface AchievementEntry {
  challenge: string;
  action: string;
  result: string;
  /** Links this achievement to a specific WorkExperienceEntry.id — used by the "combine Work Experience with Achievements" format to nest this achievement's bullet under that job. Null/undefined = not linked to any job. */
  experienceId?: string | null;
}

/**
 * One entry in the "Skills & Tools" section (Portrait template only — see
 * ResumePreview.tsx's photo-banner-sidebar family). Picked by clicking a
 * suggested keyword in the Edit Resume builder (see client's
 * config/skillsAndTools.ts) rather than typed freehand, so "category" is
 * always known up front instead of needing to be re-inferred at render
 * time (which would break if the resume's profession changed later).
 */
export interface SkillOrTool {
  label: string;
  category: "skill" | "tool";
}

/**
 * DB-backed suggestion row (see repositories/SkillSuggestionRepository.ts)
 * feeding the Skills & Tools picker's keyword chips for a given profession.
 * Reads as "AI-generated" to the person using it, but is a curated,
 * admin-editable list — same "reads like AI but isn't" pattern as templates.
 */
export interface SkillSuggestionRecord {
  id: string;
  professionKey: string;
  label: string;
  category: "skill" | "tool";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeRecord {
  id: string;
  userId: string;
  slug: string;
  fullName: string;
  contactEmail: string;
  contactPhone: string;
  contactLinkedIn: string; // full URL, e.g. https://www.linkedin.com/in/jordanlee
  /**
   * A data: URL (base64-encoded, resized/compressed client-side before
   * upload — see client/src/utils/image.ts) for the personal photo used by
   * the "Portrait" template's header. Empty string when no photo is set.
   * Stored inline rather than in object storage since this app has no file
   * storage service configured; resizing client-side keeps rows small.
   */
  photoUrl: string;
  title: string;
  profession: string;
  templateKey: string;
  visibility: LinkVisibility;
  accessPassword: string | null;
  /** ISO timestamp. Once past, a password-protected link is deactivated even with the correct password (see Resume.isPasswordExpired). NULL means no expiration. */
  accessPasswordExpiresAt: string | null;
  /** "Generate AI cover letter" checkbox — only meaningful (and only ever true) for a resume on a Premium-tier template; see ResumeService. */
  coverLetterEnabled: boolean;
  /** Rule-based generator output (see CoverLetterGenerator.ts) — empty string when coverLetterEnabled is false. */
  generatedCoverLetter: string;
  /**
   * "Recruiter Mode" toggle (Edit Resume, Premium-only — enforced in
   * ResumeService.update) — when true, the public resume link shows a
   * candidate summary card above the resume itself. See Resume.recruiterCard.
   */
  recruiterModeEnabled: boolean;
  recruiterLocation: string;
  recruiterAvailability: string;
  /** One of config/recruiterOptions.ts's CLEARANCE_OPTIONS values, or "" if unset. */
  recruiterClearance: string;
  /** One of config/recruiterOptions.ts's WORK_AUTHORIZATION_OPTIONS values, or "" if unset. */
  recruiterWorkAuthorization: string;
  recruiterExpectedSalary: string;
  /** One of config/recruiterOptions.ts's REMOTE_PREFERENCE_OPTIONS values, or "" if unset. */
  recruiterRemotePreference: string;
  /** "Combine Work Experience with Achievements" checkbox — when true, each achievement's bullet is nested under the job it's linked to (see AchievementEntry.experienceId) instead of listed in a separate flat Highlights section. */
  combineExperienceFormat: boolean;
  answers: string; // JSON-serialized Record<string, string>
  experience: string; // JSON-serialized WorkExperienceEntry[]
  education: string; // JSON-serialized EducationEntry[]
  awards: string; // JSON-serialized AwardEntry[]
  achievements: string; // JSON-serialized AchievementEntry[]
  skillsAndTools: string; // JSON-serialized SkillOrTool[]
  generatedSummary: string;
  generatedBullets: string; // JSON-serialized string[]
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export interface AdminTokenPayload {
  adminId: string;
  email: string;
}
