import { AdminTokenPayload, AuthTokenPayload, Env } from "../types";
import { UserRepository } from "../repositories/UserRepository";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { ResumeAnalyticsRepository } from "../repositories/ResumeAnalyticsRepository";
import { ResumeVersionRepository } from "../repositories/ResumeVersionRepository";
import { JobApplicationRepository } from "../repositories/JobApplicationRepository";
import { AdminRepository } from "../repositories/AdminRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";
import { PlanRepository } from "../repositories/PlanRepository";
import { SkillSuggestionRepository } from "../repositories/SkillSuggestionRepository";
import { RoleDescriptionRepository } from "../repositories/RoleDescriptionRepository";
import { AdminAuditLogRepository } from "../repositories/AdminAuditLogRepository";
import { AdminLoginIpLogRepository } from "../repositories/AdminLoginIpLogRepository";
import { EmailVerificationIpLogRepository } from "../repositories/EmailVerificationIpLogRepository";
import { TokenService } from "./TokenService";
import { AuthService } from "./AuthService";
import { ResumeService } from "./ResumeService";
import { AiCoverLetterGenerator, CoverLetterGeneratorWithFallback, RuleBasedCoverLetterGenerator } from "./CoverLetterGenerator";
import { JobApplicationService } from "./JobApplicationService";
import { SubscriptionService } from "./SubscriptionService";
import { AdminService } from "./AdminService";
import { AiContentGenerator, ContentGeneratorWithFallback, IContentGenerator, RuleBasedContentGenerator } from "./ContentGenerator";
import { StripeService } from "./StripeService";
import { EmailService } from "./EmailService";
import { ResumeImportService } from "./ResumeImportService";
import { AchievementGeneratorService } from "./AchievementGeneratorService";
import { ViewDigestService, UnsubscribeDigestTokenPayload } from "./ViewDigestService";
import { AiCareerCoachGenerator, ICareerCoachGenerator } from "./CareerCoachGenerator";

export interface Services {
  authService: AuthService;
  resumeService: ResumeService;
  subscriptionService: SubscriptionService;
  adminService: AdminService;
  stripeService: StripeService;
  /** Passed through directly for the webhook route, which needs it before it can even attempt signature verification — see SubscriptionController.webhook. */
  stripeWebhookSecret: string | undefined;
  templateRepository: TemplateRepository;
  planRepository: PlanRepository;
  skillSuggestionRepository: SkillSuggestionRepository;
  roleDescriptionRepository: RoleDescriptionRepository;
  adminAuditLogRepository: AdminAuditLogRepository;
  /** Backs the IP-based rate limit on admin login — see AdminAuthController.login. */
  adminLoginIpLogRepository: AdminLoginIpLogRepository;
  /** Backs the IP-based rate limit on verify-email/resend-verification — see AuthController. */
  emailVerificationIpLogRepository: EmailVerificationIpLogRepository;
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
  /** Real Workers AI call as of Aug 2026, wrapped with a rule-based fallback for AI outages (see ContentGeneratorWithFallback in ContentGenerator.ts) — was bare rule-based template logic. Exposed here only for symmetry with the other AI services; ResumeService is the only consumer, wired at construction below. */
  contentGenerator: IContentGenerator;
  jobApplicationService: JobApplicationService;
  viewDigestService: ViewDigestService;
  /** Real Workers AI call as of Aug 2026 (see CareerCoachGenerator.ts) — was rule-based keyword matching. */
  careerCoachGenerator: ICareerCoachGenerator;
  /** Verifies the token on GET /api/auth/unsubscribe-digest — kept separate from authService's tokenService since it's a different payload shape/purpose and a much longer expiry. */
  unsubscribeDigestTokenService: TokenService<UnsubscribeDigestTokenPayload>;
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
  const adminAuditLogRepository = new AdminAuditLogRepository(env.DB);
  const adminLoginIpLogRepository = new AdminLoginIpLogRepository(env.DB);
  const emailVerificationIpLogRepository = new EmailVerificationIpLogRepository(env.DB);
  const resumeAnalyticsRepository = new ResumeAnalyticsRepository(env.DB);
  const resumeVersionRepository = new ResumeVersionRepository(env.DB);
  const jobApplicationRepository = new JobApplicationRepository(env.DB);

  const tokenService = new TokenService<AuthTokenPayload>(env.JWT_SECRET);
  // 12h, not the default 7d — shrinks how long a leaked/stolen admin token
  // stays usable. Paired with tokenVersion-based revocation (see
  // AdminService.revokeSessions/requireAdminAuth) for the "I need this
  // invalidated right now, not in up to 12 hours" case.
  const adminTokenService = new TokenService<AdminTokenPayload>(env.ADMIN_JWT_SECRET || env.JWT_SECRET, "12h");
  // 180d, not the default 7d — an unsubscribe link in an email a user might not
  // open right away should still work weeks later, and re-confirming an
  // already-set opt-out is harmless.
  const unsubscribeDigestTokenService = new TokenService<UnsubscribeDigestTokenPayload>(env.JWT_SECRET, "180d");

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
  const authService = new AuthService(userRepo, tokenService, emailService, env.CLIENT_ORIGIN);
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
    env.STRIPE_PRICE_PREMIUM
  );
  const adminService = new AdminService(adminRepo, adminTokenService, env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
  const resumeImportService = new ResumeImportService(env.AI);
  const achievementGeneratorService = new AchievementGeneratorService(env.AI);
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

  return {
    authService,
    resumeService,
    subscriptionService,
    adminService,
    stripeService,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    templateRepository,
    planRepository,
    skillSuggestionRepository,
    roleDescriptionRepository,
    adminAuditLogRepository,
    adminLoginIpLogRepository,
    emailVerificationIpLogRepository,
    adminRepository: adminRepo,
    userRepository: userRepo,
    resumeRepository: resumeRepo,
    resumeAnalyticsRepository,
    resumeImportService,
    achievementGeneratorService,
    contentGenerator,
    jobApplicationService,
    viewDigestService,
    careerCoachGenerator,
    unsubscribeDigestTokenService,
  };
}
