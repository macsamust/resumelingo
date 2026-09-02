export type SubscriptionTier = "starter" | "professional" | "premium";
export type LinkVisibility = "public" | "password" | "private";
/** Which subscription tier a template requires — 1:1 with SubscriptionTier (basic=starter, upgrade=professional, premium=premium). */
export type TemplateCategory = "basic" | "upgrade" | "premium";

/** Which situation the AI Thank-You Letter tool is writing for — see ThankYouLetterPage.tsx. */
export type ThankYouScenario = "post-interview" | "offer-acceptance" | "staying-in-touch" | "networking";

/** Job application tracker — see JobApplicationsPage.tsx, worker's migrations/0015_job_applications.sql. Not tier-gated. */
export type JobApplicationStatus = "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";

export interface JobApplication {
  id: string;
  userId: string;
  /** Null once the linked resume is deleted, or if no resume was ever linked — the application itself is never deleted along with it. */
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

export interface ThankYouScenarioOption {
  key: ThankYouScenario;
  label: string;
}

export interface ProfessionQuestion {
  key: string;
  label: string;
  type: "text" | "textarea" | "list" | "number" | "select";
  placeholder?: string;
  /** Required, and only meaningful, when type is "select" — the dropdown's options in display order. */
  options?: string[];
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
  category: TemplateCategory;
}

/** One job in a resume's work history. Dates are "YYYY-MM" (from an <input type="month">). */
export interface WorkExperienceEntry {
  /** Stable client-generated id (see utils/id.ts) — lets an achievement link to a specific job via AchievementEntry.experienceId. Older entries created before this field existed may not have one yet; ResumeEditPage backfills those on load. */
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
 * One achievement described with the STAR/CAR method (Challenge, Action,
 * Result) — see ExperienceEditor's sibling AchievementEditor.tsx. The
 * server turns each of these into one impact-focused resume bullet.
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
 * ResumePreview.tsx's photo-banner-sidebar family, and
 * components/builder/SkillsAndToolsEditor.tsx). Picked by clicking a
 * suggested keyword (admin-editable — see api/CatalogApi.ts's
 * listSkillSuggestions) rather than typed freehand, so "category" is always
 * known up front.
 */
export interface SkillOrTool {
  label: string;
  category: "skill" | "tool";
}

/**
 * One language entry in the optional "Languages" section (see
 * components/builder/LanguagesEditor.tsx). `proficiency` is a free string,
 * but the editor only offers the standard ILR-style scale (Native/
 * Bilingual, Full Professional, Professional Working, Limited Working,
 * Elementary) so resumes read consistently.
 */
export interface LanguageEntry {
  language: string;
  proficiency: string;
}

/**
 * One professional reference (Edit Resume, Premium subscribers only — see
 * Resume.referencesEnabled and components/builder/ReferencesEditor.tsx).
 * "dateObservedStart"/"dateObservedEnd" are the range this reference worked
 * with/observed the candidate — each "YYYY-MM", same shape every other date
 * field in this app uses (see MonthYearField.tsx). Either may be "" if unset.
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
  /** Weekly resume-view digest opt-out — see ProfilePage's "Email preferences" section. Only meaningful for Professional/Premium accounts, which are the only tiers the digest is ever sent to. */
  viewDigestOptOut: boolean;
  /** Whether the current email address has been confirmed — see AppShell's "verify your email" banner. Doesn't gate any feature; it's a nudge, not an access control. */
  emailVerified: boolean;
  /** Set when Stripe reports a failed subscription-renewal charge, cleared on the next successful one — see AppShell's "update your payment method" banner. Same "nudge, not a gate" treatment as emailVerified; Stripe's own retry schedule is what actually determines whether the subscription eventually gets cancelled. */
  paymentFailed: boolean;
  /** True once a paid subscription has been scheduled to cancel at the end of the current billing period — see ProfilePage's "Cancel subscription" section. The person keeps their tier/access until currentPeriodEnd. */
  cancelAtPeriodEnd: boolean;
  /** ISO timestamp of the current paid period's end, mirrored from Stripe — null for a Starter (free) account or before Stripe has reported one. */
  currentPeriodEnd: string | null;
}

export interface Resume {
  id: string;
  userId: string;
  slug: string;
  fullName: string;
  contactEmail: string;
  contactPhone: string;
  contactLinkedIn: string;
  photoUrl: string;
  title: string;
  profession: string;
  professionLabel: string;
  templateKey: string;
  template?: TemplateDefinition;
  visibility: LinkVisibility;
  hasPassword: boolean;
  /** ISO timestamp. Once past, a password-protected link is deactivated even with the correct password. Null means no expiration. */
  accessPasswordExpiresAt: string | null;
  /** Separate on/off switch for the public link — independent of visibility/password, so pausing a link never loses that setup. */
  active: boolean;
  /** "Generate AI cover letter" checkbox — only ever true for a resume on a Premium-tier template. */
  coverLetterEnabled: boolean;
  /** Generated cover letter text, or "" when coverLetterEnabled is false. */
  generatedCoverLetter: string;
  /** "Recruiter Mode" toggle (Edit Resume, Premium-only) — see RecruiterCard. */
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
  answers: Record<string, string>;
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  awards: AwardEntry[];
  achievements: AchievementEntry[];
  /** "Skills & Tools" section — only rendered by the Portrait template. See types/index.ts SkillOrTool. */
  skillsAndTools: SkillOrTool[];
  /** Optional "Languages" section — see LanguageEntry. */
  languages: LanguageEntry[];
  /** "References" section toggle — Premium subscribers only, off by default. See ReferenceEntry. */
  referencesEnabled: boolean;
  references: ReferenceEntry[];
  /** When true, references only appear inside the Recruiter Mode candidate summary card's printout, not as their own section. Only meaningful alongside referencesEnabled. */
  referencesRecruiterModeOnly: boolean;
  generatedSummary: string;
  generatedBullets: string[];
  /** True once the subscriber has hand-edited generatedSummary/generatedBullets on Edit Resume — stops the server from silently regenerating over that edit when profession/answers/achievements/name/title change afterward. See Edit Resume's "Edit summary" panel and its "Reset to auto-generated" action. */
  summaryManuallyEdited: boolean;
  viewCount: number;
  /** Profile Strength Score (0-100) for this resume alone — same formula as DashboardSummary.profileStrengthScore, which averages this across all of a user's resumes. See server's Resume.strengthScore. */
  strengthScore: number;
  createdAt: string;
  updatedAt: string;
}

/** The candidate summary card shown at the top of a public resume link when Recruiter Mode is on. "skills" is derived server-side from the resume's own bullets/answers, not a separate field. */
export interface RecruiterCard {
  location: string;
  availability: string;
  clearance: string;
  workAuthorization: string;
  expectedSalary: string;
  remotePreference: string;
  skills: string[];
  /** Deterministic 3-4 line statement (years of experience, focus area, a quantified achievement, technical expertise, career direction) — see server's utils/candidateSummary.ts. Never fabricated: a clause is simply omitted when the resume doesn't have the underlying data. */
  candidateSummary: string;
  /** Populated only when the owner checked both "Add references" and "only in Recruiter Mode printout" — see PublicResume.references for the standalone-section alternative. */
  references: ReferenceEntry[];
}

export interface PublicResume {
  fullName: string;
  contactEmail: string;
  contactPhone: string;
  contactLinkedIn: string;
  photoUrl: string;
  title: string;
  professionLabel: string;
  templateKey: string;
  template?: TemplateDefinition;
  /** Null when the resume owner hasn't turned Recruiter Mode on. */
  recruiterCard: RecruiterCard | null;
  /** See Resume.combineExperienceFormat — same toggle, exposed here so the public link renders the same layout the owner chose. */
  combineExperienceFormat: boolean;
  answers: Record<string, string>;
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  awards: AwardEntry[];
  achievements: AchievementEntry[];
  skillsAndTools: SkillOrTool[];
  languages: LanguageEntry[];
  /** Already gated server-side (see server's Resume.publicReferences) — empty whenever referencesEnabled is off, so there's no separate flag to check here. */
  references: ReferenceEntry[];
  generatedSummary: string;
  generatedBullets: string[];
  slug: string;
}

export interface AdminAuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  totpEnabled: boolean;
}

/** One row in the admin's user list — an AuthUser plus admin-only fields. */
export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  profession: string | null;
  subscriptionTier: SubscriptionTier;
  plan: SubscriptionPlan;
  createdAt: string;
  suspended: boolean;
  resumeCount: number;
  /** The Stripe Customer this account is linked to, if any — null means they've never started a checkout. */
  stripeCustomerId: string | null;
  /** True only if Stripe confirmed an active subscription (see SubscriptionService.syncSubscription). A paid tier with this false means an admin set the tier manually, not a real Stripe subscription. */
  stripeSubscriptionActive: boolean;
  /** Most recent resumes.updatedAt across everything this user owns — there's no login tracking (stateless JWT auth), so this is the closest available signal of ongoing product use. Null for an account with zero resumes. */
  lastActivityAt: string | null;
}

/**
 * Aggregate counts shown on the admin console's landing page — see
 * api/AdminApi.ts's dashboardSummary. `rangeDays` echoes back whichever of
 * 7/30/90 the request asked for (see AdminDashboardController.summary),
 * and each `newInRange` count covers that same window.
 */
export interface AdminDashboardSummary {
  rangeDays: number;
  users: {
    total: number;
    newInRange: number;
    suspended: number;
    byTier: Record<SubscriptionTier, number>;
  };
  resumes: {
    total: number;
    newInRange: number;
  };
}

/** One resume in the admin's cross-user search results — a regular Resume plus its owner's name/email, since the admin isn't scoped to one user's page here. */
export interface AdminResumeSearchResult extends Resume {
  ownerName: string;
  ownerEmail: string;
}

/** One admin account (no password hash) — see api/AdminApi.ts's listAdmins/createAdmin. */
export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/** One entry in the admin audit log — who did what, to what, and when. See api/AdminApi.ts's listAuditLog. */
export interface AdminAuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
}

export interface AdminPlan {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  resumeLimit: number;
  features: string[];
  updatedAt: string;
}

export interface AdminTemplate {
  key: string;
  name: string;
  description: string;
  category: TemplateCategory;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Public (read-only) shape of a "Skills & Tools" suggestion keyword — see api/CatalogApi.ts's listSkillSuggestions. */
export interface SkillSuggestion {
  id: string;
  professionKey: string;
  label: string;
  category: "skill" | "tool";
}

/** Admin CRUD shape — same fields plus sortOrder/timestamps — see api/AdminApi.ts. */
export interface AdminSkillSuggestion extends SkillSuggestion {
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Admin CRUD shape for a role description — the About statement voice for
 * either one named profession (professionKey set) or, when professionKey is
 * null, one of the "Other" profession's keyword-matched sub-categories or
 * the generic fallback row (see server's ContentGenerator.ts). Reads as
 * "AI-generated" but is a curated, admin-editable list — see
 * pages/admin/AdminRoleDescriptionsPage.tsx.
 */
export interface AdminRoleDescription {
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

/** Premium-only — see server's DashboardController.buildResumeAnalytics(). Null for Starter/Professional. */
export interface ResumeAnalytics {
  strengthDistribution: { strong: number; moderate: number; needsWork: number };
  sectionGaps: { resumeId: string; title: string; missing: string[] }[];
  staleResumes: { resumeId: string; title: string; daysSinceUpdate: number }[];
  viewTrend: { thisWeek: number; lastWeek: number; daily: { date: string; count: number }[] };
  scoreTrend: { averageDelta: number; improved: { resumeId: string; title: string; delta: number }[] };
  /** Most frequently missing job-description keywords across every logged ATS Check on this account — see ResumeApi.recordKeywordCheck. */
  recurringMissingKeywords: { word: string; count: number }[];
  comparison: {
    strongest: { resumeId: string; title: string; score: number };
    weakest: { resumeId: string; title: string; score: number };
    gapDrivers: string[];
  } | null;
}

/** One entry in a resume's version history — see ResumeApi.listVersions/restoreVersion. Professional/Premium only. Only the title is used for display; the rest of the snapshot's content isn't needed until the version is actually restored (server-side). */
export interface ResumeVersion {
  id: string;
  createdAt: string;
  snapshot: { title: string };
  /** Short auto-generated note on what changed going into this save, e.g. "Switched template from Modern to Classic" — see worker's utils/versionChangeSummary.ts. "" for versions saved before this field existed. */
  changeSummary: string;
}

export interface DashboardSummary {
  myResumes: Resume[];
  sharedLinks: { title: string; slug: string; visibility: LinkVisibility }[];
  resumeViews: number;
  profileStrengthScore: number;
  suggestedImprovements: string[];
  resumeAnalytics: ResumeAnalytics | null;
  /** Recent public views of Recruiter-Mode-enabled resumes only, newest first — see NotificationBell.tsx. Always [] for accounts with no Recruiter Mode resumes or no recent views. */
  recentViews: { resumeId: string; title: string; viewedAt: string }[];
  subscription: {
    tier: SubscriptionTier;
    planName: string;
    resumesUsed: number;
    resumeLimit: number;
    unlimited: boolean;
    remaining: number | null;
  };
}
