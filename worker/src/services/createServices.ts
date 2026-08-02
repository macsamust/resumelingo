import { Env } from "../types";
import { UserRepository } from "../repositories/UserRepository";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { TokenService } from "./TokenService";
import { AuthService } from "./AuthService";
import { ResumeService } from "./ResumeService";
import { SubscriptionService } from "./SubscriptionService";

export interface Services {
  authService: AuthService;
  resumeService: ResumeService;
  subscriptionService: SubscriptionService;
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
  const tokenService = new TokenService(env.JWT_SECRET);

  const authService = new AuthService(userRepo, tokenService);
  const resumeService = new ResumeService(resumeRepo, userRepo);
  const subscriptionService = new SubscriptionService(userRepo);

  return { authService, resumeService, subscriptionService };
}
