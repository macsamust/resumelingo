import { AdminTokenPayload, AuthTokenPayload, Env } from "../types";
import { UserRepository } from "../repositories/UserRepository";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { ResumeAnalyticsRepository } from "../repositories/ResumeAnalyticsRepository";
import { ResumeVersionRepository } from "../repositories/ResumeVersionRepository";
import { AdminRepository } from "../repositories/AdminRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";
import { PlanRepository } from "../repositories/PlanRepository";
import { SkillSuggestionRepository } from "../repositories/SkillSuggestionRepository";
import { RoleDescriptionRepository } from "../repositories/RoleDescriptionRepository";
import { TokenService } from "./TokenService";
import { AuthService } from "./AuthService";
import { ResumeService } from "./ResumeService";
import { SubscriptionService } from "./SubscriptionService";
import { AdminService } from "./AdminService";
import { RuleBasedContentGenerator } from "./ContentGenerator";
import { StripeService } from "./StripeService";
import { EmailService } from "./EmailService";

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
  /** Exposed directly (not just via authService) for the admin console's user-management screens — see AdminUserController. */
  userRepository: UserRepository;
  /** Exposed directly for the admin console's "view a user's resumes" drill-down and cascade-delete — see AdminUserController. */
  resumeRepository: ResumeRepository;
  /** Exposed directly for DashboardController's Resume Analytics aggregation and ResumeController.recordKeywordCheck. */
  resumeAnalyticsRepository: ResumeAnalyticsRepository;
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
  const resumeAnalyticsRepository = new ResumeAnalyticsRepository(env.DB);
  const resumeVersionRepository = new ResumeVersionRepository(env.DB);

  const tokenService = new TokenService<AuthTokenPayload>(env.JWT_SECRET);
  const adminTokenService = new TokenService<AdminTokenPayload>(env.ADMIN_JWT_SECRET || env.JWT_SECRET);

  const contentGenerator = new RuleBasedContentGenerator(roleDescriptionRepository);

  const emailService = new EmailService(env.RESEND_API_KEY, env.RESEND_FROM_EMAIL);
  const authService = new AuthService(userRepo, tokenService, emailService, env.CLIENT_ORIGIN);
  const resumeService = new ResumeService(resumeRepo, userRepo, contentGenerator, resumeAnalyticsRepository, resumeVersionRepository);
  const stripeService = new StripeService(env.STRIPE_SECRET_KEY);
  const subscriptionService = new SubscriptionService(
    userRepo,
    stripeService,
    env.STRIPE_PRICE_PROFESSIONAL,
    env.STRIPE_PRICE_PREMIUM
  );
  const adminService = new AdminService(adminRepo, adminTokenService, env.ADMIN_EMAIL, env.ADMIN_PASSWORD);

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
    userRepository: userRepo,
    resumeRepository: resumeRepo,
    resumeAnalyticsRepository,
  };
}
