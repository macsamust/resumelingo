import { AdminTokenPayload, AuthTokenPayload, Env } from "../types";
import { UserRepository } from "../repositories/UserRepository";
import { RefreshTokenRepository } from "../repositories/RefreshTokenRepository";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { ResumeAnalyticsRepository } from "../repositories/ResumeAnalyticsRepository";
import { ResumeVersionRepository } from "../repositories/ResumeVersionRepository";
import { JobApplicationRepository } from "../repositories/JobApplicationRepository";
import { AdminRepository } from "../repositories/AdminRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";
import { PlanRepository } from "../repositories/PlanRepository";
import { SkillSuggestionRepository } from "../repositories/SkillSuggestionRepository";
import { RoleDescriptionRepository } from "../repositories/RoleDescriptionRepository";
import { EmailTemplateNoteRepository } from "../repositories/EmailTemplateNoteRepository";
import { AdminAuditLogRepository } from "../repositories/AdminAuditLogRepository";
import { AdminLoginIpLogRepository } from "../repositories/AdminLoginIpLogRepository";
import { EmailVerificationIpLogRepository } from "../repositories/EmailVerificationIpLogRepository";
import { PublicResumePasswordIpLogRepository } from "../repositories/PublicResumePasswordIpLogRepository";
import { PublicResumeRecruiterCodeIpLogRepository } from "../repositories/PublicResumeRecruiterCodeIpLogRepository";
import { SecurityEventRepository } from "../repositories/SecurityEventRepository";
import { MarketingEventRepository } from "../repositories/MarketingEventRepository";
import { TokenService } from "./TokenService";
import { AuthService } from "./AuthService";
import { ResumeService } from "./ResumeService";
import { AiCoverLetterGenerator, CoverLetterGeneratorWithFallback, ICoverLetterGenerator, RuleBasedCoverLetterGenerator } from "./CoverLetterGenerator";
import { JobApplicationService } from "./JobApplicationService";
import { SubscriptionService } from "./SubscriptionService";
import { AdminService } from "./AdminService";
import { AiContentGenerator, ContentGeneratorWithFallback, IContentGenerator, RuleBasedContentGenerator } from "./ContentGenerator";
import { StripeService } from "./StripeService";
import { EmailService } from "./EmailService";
import { ResumeImportService } from "./ResumeImportService";
import { AchievementGeneratorService } from "./AchievementGeneratorService";
import { SkillSuggestionAiService } from "./SkillSuggestionAiService";
import { ViewDigestService, UnsubscribeDigestTokenPayload } from "./ViewDigestService";
import { ResumeRefreshNudgeService, ResumeRefreshNudgeTokenPayload } from "./ResumeRefreshNudgeService";
import { StaleAccountCleanupService } from "./StaleAccountCleanupService";
import { AiCareerCoachGenerator, ICareerCoachGenerator } from "./CareerCoachGenerator";
import { SecurityAlertService } from "./SecurityAlertService";
import { SecurityMonitorService } from "./SecurityMonitorService";
import { CareerLoopProgressRepository } from "../repositories/CareerLoopProgressRepository";
import { CareerLoopEventRepository } from "../repositories/CareerLoopEventRepository";
import { CareerLoopService, isCareerLoopEnabled } from "./CareerLoopService";

export interface Services {
  authService: AuthService;
  resumeService: ResumeService;
  subscriptionService: SubscriptionService;
  adminService: AdminService;
  stripeService: StripeService;
  /** Exposed directly (not just via the services that call it) for AdminEmailTemplateController's preview page — see EmailService.renderPreview/TEMPLATES. */
  emailService: EmailService;
  /**
   * Every configured Stripe webhook signing secret (live + test mode — see
   * Env.STRIPE_WEBHOOK_SECRET/STRIPE_WEBHOOK_SECRET_TEST), passed through
   * directly for the webhook route, which needs to know before it can even
   * attempt signature verification — see SubscriptionController.webhook and
   * StripeService.constructWebhookEvent.
   */
  stripeWebhookSecrets: string[];
  templateRepository: TemplateRepository;
  planRepository: PlanRepository;
  skillSuggestionRepository: SkillSuggestionRepository;
  roleDescriptionRepository: RoleDescriptionRepository;
  /** Backs the Admin Console's Email Templates preview page — see AdminEmailTemplateController. */
  emailTemplateNoteRepository: EmailTemplateNoteRepository;
  adminAuditLogRepository: AdminAuditLogRepository;
  /** Backs the IP-based rate limit on admin login — see AdminAuthController.login. */
  adminLoginIpLogRepository: AdminLoginIpLogRepository;
  /** Backs the IP-based rate limit on verify-email/resend-verification/login/register — see AuthController. */
  emailVerificationIpLogRepository: EmailVerificationIpLogRepository;
  /** Backs the IP+slug-based rate limit on password-protected public resume links — see PublicController.getBySlug. */
  publicResumePasswordIpLogRepository: PublicResumePasswordIpLogRepository;
  /** Backs the IP+slug-based rate limit on Recruiter Mode's access-code unlock — see PublicController.unlockRecruiterCard. Its own table (not shared with the password log) so the two guess budgets can't exhaust each other. */
  publicResumeRecruiterCodeIpLogRepository: PublicResumeRecruiterCodeIpLogRepository;
  /** Durable log of flagged abuse/anomaly signals — see SecurityEventRepository.ts. Exposed directly for AdminSecurityEventController's Security Report page. */
  securityEventRepository: SecurityEventRepository;
  /** Durable funnel-event log (e.g. plan_clicked) — see MarketingEventRepository.ts. No analytics vendor is wired into this app, so this is the closest thing to one. */
  marketingEventRepository: MarketingEventRepository;
  /** Writes to securityEventRepository (with dedupe) and fires an immediate email on critical severity — the single call site every throttled controller uses. */
  securityAlertService: SecurityAlertService;
  /** Daily cron consumer — see index.ts's `scheduled` export. */
  securityMonitorService: SecurityMonitorService;
  /** Exposed directly for the admin console's own account-management screen — see AdminManagementController. */
  adminRepository: AdminRepository;
  /** Exposed directly (not just via authService) for the admin console's user-management screens — see AdminUserController. */
  userRepository: UserRepository;
  /** Exposed directly for the admin console's "view a user's resumes" drill-down and cascade-delete — see AdminUserController. */
  resumeRepository: ResumeRepository;
  /** Exposed directly for DashboardController's Resume Analytics aggregation and ResumeController.recordKeywordCheck. */
  resumeAnalyticsRepository: ResumeAnalyticsRepository;
  resumeImportService: ResumeImportService;
  achievementGeneratorService: AchievementGeneratorService;
  /** Real Workers AI call, additive to the curated skill_suggestions catalog — see SkillSuggestionAiService.ts. */
  skillSuggestionAiService: SkillSuggestionAiService;
  /** Real Workers AI call as of Aug 2026, wrapped with a rule-based fallback for AI outages (see ContentGeneratorWithFallback in ContentGenerator.ts) — was bare rule-based template logic. Exposed here only for symmetry with the other AI services; ResumeService is the only consumer, wired at construction below. */
  contentGenerator: IContentGenerator;
  /** Same AI-with-fallback wrapper as contentGenerator, but with two consumers now (Sep 2026): ResumeService's embedded coverLetterEnabled flow, and CoverLetterController's standalone tool. */
  coverLetterGenerator: ICoverLetterGenerator;
  jobApplicationService: JobApplicationService;
  /** Exposed directly for AdminDashboardController's engagement tile (Application Tracker adoption count) — every other consumer goes through jobApplicationService. */
  jobApplicationRepository: JobApplicationRepository;
  viewDigestService: ViewDigestService;
  /** Real Workers AI call as of Aug 2026 (see CareerCoachGenerator.ts) — was rule-based keyword matching. */
  careerCoachGenerator: ICareerCoachGenerator;
  /** Verifies the token on GET /api/auth/unsubscribe-digest — kept separate from authService's tokenService since it's a different payload shape/purpose and a much longer expiry. */
  unsubscribeDigestTokenService: TokenService<UnsubscribeDigestTokenPayload>;
  /** Signs/verifies the no-login nudge link's token (see ResumeRefreshNudgeService.ts) — its own TokenService instance since it's a different payload shape/purpose/expiry than the other two. */
  resumeRefreshNudgeTokenService: TokenService<ResumeRefreshNudgeTokenPayload>;
  /** Daily cron consumer — see index.ts's `scheduled` export. */
  resumeRefreshNudgeService: ResumeRefreshNudgeService;
  staleAccountCleanupService: StaleAccountCleanupService;
  /** "Full Circle" post-publish coach — see CareerLoopService.ts. Bare (no fallback), same as the other non-critical-path services; this is pure D1 reads/writes with no AI dependency to fall back from. */
  careerLoopService: CareerLoopService;
  /** True only when Env.CAREER_LOOP_ENABLED is the literal string "true" — see isCareerLoopEnabled's doc comment. Every Full Circle route/controller checks this before doing anything, so the whole feature is a single config flip to disable. */
  careerLoopEnabled: boolean;
}

/**
 * Builds one instance of each service, wired to this request's D1 binding.
 * Workers are stateless between requests, so — unlike the Express version,
 * where repositories/services could be constructed once at module load —
 * everything here is built fresh per request by `servicesMiddleware`. The
 * classes themselves are cheap to construct (no connection pooling needed;
 * D1 handles that internally), so this has no real performance cost.
 */
export function createServices(env: Env): Services {
  const userRepo = new UserRepository(env.DB);
  const resumeRepo = new ResumeRepository(env.DB);
  const adminRepo = new AdminRepository(env.DB);
  const templateRepository = new TemplateRepository(env.DB);
  const planRepository = new PlanRepository(env.DB);
  const skillSuggestionRepository = new SkillSuggestionRepository(env.DB);
  const roleDescriptionRepository = new RoleDescriptionRepository(env.DB);
  const emailTemplateNoteRepository = new EmailTemplateNoteRepository(env.DB);
  const adminAuditLogRepository = new AdminAuditLogRepository(env.DB);
  const adminLoginIpLogRepository = new AdminLoginIpLogRepository(env.DB);
  const emailVerificationIpLogRepository = new EmailVerificationIpLogRepository(env.DB);
  const publicResumePasswordIpLogRepository = new PublicResumePasswordIpLogRepository(env.DB);
  const publicResumeRecruiterCodeIpLogRepository = new PublicResumeRecruiterCodeIpLogRepository(env.DB);
  const securityEventRepository = new SecurityEventRepository(env.DB);
  const marketingEventRepository = new MarketingEventRepository(env.DB);
  const resumeAnalyticsRepository = new ResumeAnalyticsRepository(env.DB);
  const resumeVersionRepository = new ResumeVersionRepository(env.DB);
  const jobApplicationRepository = new JobApplicationRepository(env.DB);
  const careerLoopProgressRepository = new CareerLoopProgressRepository(env.DB);
  const careerLoopEventRepository = new CareerLoopEventRepository(env.DB);
  const refreshTokenRepository = new RefreshTokenRepository(env.DB);

  // 20m, not the class default 7d — SEC-A01 (Sep 2026) moved subscriber auth
  // to a short-lived access-token cookie backed by RefreshTokenRepository's
  // long-lived, revocable refresh token (see migration 0049's doc comment
  // and utils/authCookies.ts). Must match ACCESS_TOKEN_TTL_SECONDS.
  const tokenService = new TokenService<AuthTokenPayload>(env.JWT_SECRET, "20m");
  // 12h, not the default 7d — shrinks how long a leaked/stolen admin token
  // stays usable. Paired with tokenVersion-based revocation (see
  // AdminService.revokeSessions/requireAdminAuth) for the "I need this
  // invalidated right now, not in up to 12 hours" case.
  const adminTokenService = new TokenService<AdminTokenPayload>(env.ADMIN_JWT_SECRET || env.JWT_SECRET, "12h");
  // 180d, not the default 7d — an unsubscribe link in an email a user might not
  // open right away should still work weeks later, and re-confirming an
  // already-set opt-out is harmless.
  const unsubscribeDigestTokenService = new TokenService<UnsubscribeDigestTokenPayload>(env.JWT_SECRET, "180d");
  // 30d — see ResumeRefreshNudgeTokenPayload's doc comment for why this is
  // much shorter than the unsubscribe link's 180d.
  const resumeRefreshNudgeTokenService = new TokenService<ResumeRefreshNudgeTokenPayload>(env.JWT_SECRET, "30d");

  // Wrapped in a fallback, not wired up bare — resume create/update used to
  // be pure D1 + template logic with no way to fail, and a raw Workers AI
  // outage/budget cap shouldn't be able to block a subscriber from saving
  // their resume. See ContentGeneratorWithFallback/CoverLetterGeneratorWithFallback's
  // doc comments.
  const contentGenerator = new ContentGeneratorWithFallback(
    new AiContentGenerator(env.AI),
    new RuleBasedContentGenerator(roleDescriptionRepository)
  );
  const coverLetterGenerator = new CoverLetterGeneratorWithFallback(
    new AiCoverLetterGenerator(env.AI),
    new RuleBasedCoverLetterGenerator()
  );

  const emailService = new EmailService(env.RESEND_API_KEY, env.RESEND_FROM_EMAIL);
  const authService = new AuthService(userRepo, tokenService, emailService, env.CLIENT_ORIGIN, refreshTokenRepository);
  const resumeService = new ResumeService(
    resumeRepo,
    userRepo,
    contentGenerator,
    resumeAnalyticsRepository,
    resumeVersionRepository,
    coverLetterGenerator
  );
  const stripeService = new StripeService(env.STRIPE_SECRET_KEY);
  const subscriptionService = new SubscriptionService(
    userRepo,
    stripeService,
    env.STRIPE_PRICE_PROFESSIONAL,
    env.STRIPE_PRICE_PREMIUM,
    emailService,
    env.CLIENT_ORIGIN,
    resumeRepo
  );
  const adminService = new AdminService(adminRepo, adminTokenService, env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
  const resumeImportService = new ResumeImportService(env.AI);
  const achievementGeneratorService = new AchievementGeneratorService(env.AI);
  const skillSuggestionAiService = new SkillSuggestionAiService(env.AI);
  const jobApplicationService = new JobApplicationService(jobApplicationRepository, resumeRepo, userRepo);
  const careerCoachGenerator = new AiCareerCoachGenerator(env.AI);
  const viewDigestService = new ViewDigestService(
    userRepo,
    resumeRepo,
    resumeAnalyticsRepository,
    emailService,
    unsubscribeDigestTokenService,
    env.CLIENT_ORIGIN
  );
  const resumeRefreshNudgeService = new ResumeRefreshNudgeService(
    resumeRepo,
    skillSuggestionRepository,
    emailService,
    resumeRefreshNudgeTokenService,
    unsubscribeDigestTokenService,
    env.CLIENT_ORIGIN
  );
  const staleAccountCleanupService = new StaleAccountCleanupService(
    userRepo,
    resumeRepo,
    jobApplicationRepository,
    emailService,
    authService,
    adminAuditLogRepository
  );
  const careerLoopService = new CareerLoopService(careerLoopProgressRepository, jobApplicationRepository, careerLoopEventRepository);
  const careerLoopEnabled = isCareerLoopEnabled(env);
  const securityAlertService = new SecurityAlertService(securityEventRepository, adminRepo, emailService, env.ADMIN_EMAIL);
  const securityMonitorService = new SecurityMonitorService(
    adminAuditLogRepository,
    adminRepo,
    securityEventRepository,
    emailService,
    env.ADMIN_EMAIL
  );

  return {
    authService,
    resumeService,
    subscriptionService,
    adminService,
    stripeService,
    emailService,
    stripeWebhookSecrets: [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_WEBHOOK_SECRET_TEST].filter(
      (secret): secret is string => !!secret
    ),
    templateRepository,
    planRepository,
    skillSuggestionRepository,
    roleDescriptionRepository,
    emailTemplateNoteRepository,
    adminAuditLogRepository,
    adminLoginIpLogRepository,
    emailVerificationIpLogRepository,
    publicResumePasswordIpLogRepository,
    publicResumeRecruiterCodeIpLogRepository,
    securityEventRepository,
    marketingEventRepository,
    securityAlertService,
    securityMonitorService,
    adminRepository: adminRepo,
    userRepository: userRepo,
    resumeRepository: resumeRepo,
    resumeAnalyticsRepository,
    resumeImportService,
    achievementGeneratorService,
    skillSuggestionAiService,
    contentGenerator,
    coverLetterGenerator,
    jobApplicationService,
    jobApplicationRepository,
    viewDigestService,
    careerCoachGenerator,
    unsubscribeDigestTokenService,
    resumeRefreshNudgeTokenService,
    resumeRefreshNudgeService,
    staleAccountCleanupService,
    careerLoopService,
    careerLoopEnabled,
  };
}
