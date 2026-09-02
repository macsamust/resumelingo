/**
 * Canonical type definitions shared by server/ (Node+Express+Postgres) and
 * worker/ (Cloudflare Workers+Hono+D1). Both backends implement the exact
 * same domain — same DB record shapes, same catalog/config value types,
 * same auth token payloads — so instead of hand-duplicating these
 * interfaces (and letting them drift, which is exactly what had started
 * happening before this package existed), both backends' own
 * `src/types/index.ts` now just re-export everything from here.
 *
 * Deliberately NOT consumed by client/ — the client works with parsed API
 * responses (e.g. `experience: WorkExperienceEntry[]`), not raw DB records
 * (`experience: string // JSON-serialized`), so its view types are a
 * legitimately different shape and live in client/src/types/index.ts.
 *
 * Anything backend-specific (worker's `Env` Cloudflare bindings, for
 * example) stays local to that backend's own types file instead of moving
 * here — this package is only for the parts that must stay identical.
 */

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
  type: "text" | "textarea" | "list" | "number" | "select";
  placeholder?: string;
  /** Required, and only meaningful, when type is "select" — the dropdown's options in display order. */
  options?: string[];
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
  /** Self-service password reset — only the SHA-256 hash is stored, never the raw token. Both null when no reset is in flight. */
  resetTokenHash: string | null;
  resetTokenExpiresAt: string | null;
  /** Opt-out flag for the weekly re-engagement view-count digest email (ViewDigestService). Defaults false (receiving it) — only ever read for Professional/Premium accounts, see UserRepository.findEligibleForDigest. */
  viewDigestOptOut: boolean;
  /** Whether this account's current email address has been confirmed via the verification-link flow (AuthService.verifyEmail). Existing accounts were grandfathered to true when this shipped — see migration 0017. Doesn't gate login or any feature; AppShell just shows a dismissible nudge banner when false. */
  emailVerified: boolean;
  /** Same hashed-token-only pattern as resetTokenHash/resetTokenExpiresAt — never store the raw token. Both null when no verification is pending. */
  verificationTokenHash: string | null;
  verificationTokenExpiresAt: string | null;
  /** Set when Stripe reports a failed subscription-renewal charge (invoice.payment_failed) and cleared again on the next successful charge (invoice.paid) — see SubscriptionService.handleWebhookEvent. Doesn't gate anything itself; AppShell shows a dismissible "update your payment method" banner while true, same treatment as emailVerified. If it's never cleared, Stripe's own retry schedule eventually cancels the subscription (customer.subscription.deleted), which already flips subscriptionTier back to starter independently of this flag. */
  paymentFailed: boolean;
  /** True once a paid subscription has been told to cancel at the end of the current billing period (see SubscriptionService.cancelSubscription) — the person keeps their tier/access until then rather than losing it immediately. Cleared back to false by resumeSubscription, or once the period actually ends and the webhook syncs the account back to Starter. */
  cancelAtPeriodEnd: boolean;
  /** ISO timestamp of the current paid period's end, mirrored from Stripe's subscription.current_period_end — null for a Starter (free) account or before Stripe has reported one. Shown to the person as "access until <date>" when cancelAtPeriodEnd is true. */
  currentPeriodEnd: string | null;
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
  /** Consecutive failed login attempts since the last success — reset to 0 on a successful login. See AdminService.login's lockout logic. */
  failedLoginAttempts: number;
  /** ISO timestamp the account is locked until, or null if not currently locked. */
  lockedUntil: string | null;
  /** Bumped to invalidate every previously-issued admin JWT for this account at once — see AdminService.revokeSessions and requireAdminAuth's check against AdminTokenPayload.tokenVersion. Stateless JWTs otherwise stay valid until they naturally expire, with no way to force an early logout (e.g. a stolen token, a suspected-compromised session). */
  tokenVersion: number;
  /** Base32 TOTP secret, or null until 2FA is enrolled. Never sent to the client after enrollment completes — see Admin.toPublicJSON. */
  totpSecret: string | null;
  totpEnabled: boolean;
  /** SHA-256 hashes of unused one-time backup codes, JSON-serialized. Each is consumed (removed from this array) the first time it's used in place of a TOTP code — see AdminService.verifyTotpOrBackupCode. Critical for the solo-admin case: losing the authenticator device with no backup codes and no second admin account would mean total, unrecoverable lockout from the admin console. */
  totpBackupCodeHashes: string;
}

/** One entry in the admin_audit_log table (see repositories/AdminAuditLogRepository.ts) — records who did what, to what, and when for every sensitive admin action. */
export interface AdminAuditLogRecord {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
  /**
   * SHA-256 hex of (this row's own fields + the previous row's `hash`) —
   * a hash chain, same idea as a blockchain's block-linking without any of
   * its distributed-consensus machinery. Editing or deleting any past row
   * breaks the chain from that point forward, so AdminAuditLogRepository.
   * verifyChainIntegrity() can detect tampering even by someone with direct
   * D1 access, which a plain append-only table can't. The very first row
   * chains against a fixed genesis string (see AdminAuditLogRepository).
   */
  hash: string;
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

/**
 * DB-backed row (see repositories/RoleDescriptionRepository.ts) feeding
 * ContentGenerator's About-statement voice — either for one named
 * profession (professionKey set, e.g. "software-engineer") or, when
 * professionKey is unset, one of the "Other" profession's keyword-matched
 * sub-categories (e.g. comedian/actor) or the generic fallback row. Reads
 * as "AI-generated" but is a curated, admin-editable list — same pattern as
 * SkillSuggestionRecord above, except this one is also cached in-memory
 * (see config/roleDescriptions.ts) since it's read on the hot resume-save
 * path.
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
 * One language entry in the optional "Languages" section — `proficiency`
 * is a free string but the builder's LanguagesEditor only offers the
 * standard ILR-style scale (Native/Bilingual, Full Professional,
 * Professional Working, Limited Working, Elementary) so resumes read
 * consistently without this being a hardcoded enum here.
 */
export interface LanguageEntry {
  language: string;
  proficiency: string;
}

/**
 * One professional reference (Edit Resume, Premium subscribers only — see
 * ResumeRecord.referencesEnabled). "dateObservedStart"/"dateObservedEnd" are
 * the range this reference worked with/observed the candidate, each
 * "YYYY-MM" like every other date field in this app (see client's
 * MonthYearField.tsx). Either may be "" if unset.
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
  languages: string; // JSON-serialized LanguageEntry[]
  /**
   * "References" section (Edit Resume, Premium subscribers only —
   * re-checked and silently coerced off on every update in
   * ResumeService.update, same subscriber-tier gate as recruiterModeEnabled,
   * not tied to which template is selected). Off by default — see
   * Resume.toPublicJSON, which only exposes `references` when this is true.
   */
  referencesEnabled: boolean;
  references: string; // JSON-serialized ReferenceEntry[]
  /** When true, references only appear inside the Recruiter Mode candidate summary card's printout, not as their own section — see Resume.publicReferences/recruiterCard. Only meaningful alongside referencesEnabled. */
  referencesRecruiterModeOnly: boolean;
  generatedSummary: string;
  generatedBullets: string; // JSON-serialized string[]
  /** True once the subscriber has hand-edited generatedSummary/generatedBullets on Edit Resume (see ResumeEditPage.tsx's "Edit summary" panel) — stops ResumeService.update from silently regenerating over that edit when profession/answers/achievements/name/title change afterward. A "Reset to auto-generated" action clears it back to false. Defaults to false (admin support edits via AdminResumeEditPage.tsx don't set this). */
  summaryManuallyEdited: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export type JobApplicationStatus = "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";

/**
 * Job application tracker — see worker/migrations/0015_job_applications.sql
 * and TODO.md's "Product review" note. Net-new domain model tying which
 * resume (if any) was sent where, and what happened after; not part of the
 * Resume record itself since one resume can be sent to many roles.
 */
export interface JobApplicationRecord {
  id: string;
  userId: string;
  /** Null once the linked resume is deleted (see ResumeRepository.delete/deleteBulk/deleteAllForUser) or if no resume was ever linked — the application row itself is never deleted along with it. */
  resumeId: string | null;
  company: string;
  role: string;
  status: JobApplicationStatus;
  /** ISO date (yyyy-mm-dd), or null if not set. */
  appliedDate: string | null;
  link: string;
  notes: string;
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
  /** Must match AdminRecord.tokenVersion at verify time — see requireAdminAuth. Lets a stateless JWT still be revoked early. */
  tokenVersion: number;
}
