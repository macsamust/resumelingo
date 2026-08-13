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

/**
 * "suspended" was added in migrations/0004_admin_catalog.sql (Phase 3, to
 * back the admin console's suspend/reinstate action); stripeCustomerId/
 * stripeSubscriptionId were added in migrations/0005_stripe_billing.sql
 * (Phase 4) — see services/SubscriptionService.ts.
 */
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  profession: string | null;
  subscriptionTier: SubscriptionTier;
  suspended: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

/**
 * Admin accounts are a deliberately separate role/auth system from regular
 * users (see services/AdminService.ts) — their own table, own JWT secret,
 * own token payload — rather than an isAdmin flag on the users table, so a
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
 * Deliberately does NOT store stripePriceId, same reasoning as server/'s
 * PlanRecord — editing a plan's price here changes what's *displayed*, not
 * what Stripe actually charges (out of scope, Phase 4).
 */
export interface PlanRecord {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  resumeLimit: number;
  features: string; // JSON-serialized string[]
  updatedAt: string;
}

/**
 * DB-backed suggestion row (see repositories/SkillSuggestionRepository.ts)
 * feeding the Skills & Tools picker's keyword chips for a given profession.
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

/**
 * DB-backed row (see repositories/RoleDescriptionRepository.ts) feeding
 * ContentGenerator's About-statement voice — either for one named
 * profession (professionKey set) or, when professionKey is unset, one of
 * the "Other" profession's keyword-matched sub-categories or the generic
 * fallback row.
 */
export interface RoleDescriptionRecord {
  id: string;
  keywords: string[];
  category: string;
  descriptor: string;
  traits: [string, string, string];
  outcome: string;
  keyTraits: [string, string, string];
  isFallback: boolean;
  /** Matches this row to one of config/professions.ts's keys directly, instead of via keyword. Null for keyword-matched and fallback rows. */
  professionKey: string | null;
  sortOrder: number;
  createdAt: string;
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
 * suggested keyword in the Edit Resume builder rather than typed freehand,
 * so "category" is always known up front instead of needing to be
 * re-inferred at render time.
 */
export interface SkillOrTool {
  label: string;
  category: "skill" | "tool";
}

/**
 * One professional reference (Edit Resume, Premium subscribers only — see
 * ResumeRecord.referencesEnabled). "dateObservedStart"/"dateObservedEnd" are
 * the range this reference worked with/observed the candidate, each
 * "YYYY-MM" like every other date field in this app. Either may be "" if unset.
 */
export interface ReferenceEntry {
  name: string;
  companyPosition: string;
  company: string;
  email: string;
  phone: string;
  affiliation: string;
  dateObservedStart: string;
  dateObservedEnd: string;
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
   * upload) for the personal photo used by the "Portrait" template's header.
   * Empty string when no photo is set.
   */
  photoUrl: string;
  title: string;
  profession: string;
  templateKey: string;
  visibility: LinkVisibility;
  accessPassword: string | null;
  /** ISO timestamp. Once past, a password-protected link is deactivated even with the correct password (see Resume.isPasswordExpired). NULL means no expiration. */
  accessPasswordExpiresAt: string | null;
  /**
   * A separate on/off switch for the public link, independent of
   * visibility/accessPassword — lets the owner pause a link (e.g. between
   * job searches) without losing or reconfiguring whatever
   * visibility/password setup it already had. Always true for a
   * newly-created or cloned resume. See Resume.isAccessibleBy /
   * ResumeService.getPublicBySlug.
   */
  active: boolean;
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
  recruiterClearance: string;
  recruiterWorkAuthorization: string;
  recruiterExpectedSalary: string;
  recruiterRemotePreference: string;
  /** "Combine Work Experience with Achievements" checkbox — when true, each achievement's bullet is nested under the job it's linked to (see AchievementEntry.experienceId) instead of listed in a separate flat Highlights section. */
  combineExperienceFormat: boolean;
  answers: string; // JSON-serialized Record<string, string>
  experience: string; // JSON-serialized WorkExperienceEntry[]
  education: string; // JSON-serialized EducationEntry[]
  awards: string; // JSON-serialized AwardEntry[]
  achievements: string; // JSON-serialized AchievementEntry[]
  skillsAndTools: string; // JSON-serialized SkillOrTool[]
  /**
   * "References" section (Edit Resume, Premium subscribers only —
   * re-checked and silently coerced off on every update in
   * ResumeService.update, same subscriber-tier gate as recruiterModeEnabled,
   * not tied to which template is selected). Off by default.
   */
  referencesEnabled: boolean;
  references: string; // JSON-serialized ReferenceEntry[]
  /** When true, references only appear inside the Recruiter Mode candidate summary card's printout, not as their own section. Only meaningful alongside referencesEnabled. */
  referencesRecruiterModeOnly: boolean;
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

/** Cloudflare bindings available on every request (see wrangler.jsonc). */
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  CLIENT_ORIGIN: string;
  /** Falls back to JWT_SECRET if unset — see services/AdminService.ts. */
  ADMIN_JWT_SECRET?: string;
  /** Optional bootstrap-admin credentials — see AdminService.ensureBootstrapAdmin. */
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  /** Stripe billing (Phase 4) — see services/StripeService.ts and SubscriptionService.ts. All optional so the app still runs without billing configured. */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PROFESSIONAL?: string;
  STRIPE_PRICE_PREMIUM?: string;
}
