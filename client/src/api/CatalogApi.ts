import { ApiClient } from "./ApiClient";
import { AuthUser, DashboardSummary, ProfessionDefinition, ProfessionSummary, PublicResume, RecruiterCard, SkillSuggestion, SubscriptionPlan, TemplateDefinition } from "../types";

/** Read-mostly catalog + dashboard + public endpoints, grouped since none need dedicated state. */
export class CatalogApi extends ApiClient {
  listProfessions() {
    return this.get<{ professions: ProfessionSummary[] }>("/professions");
  }

  getProfessionQuestions(key: string) {
    return this.get<{ profession: ProfessionDefinition }>(`/professions/${key}`);
  }

  listTemplates() {
    return this.get<{ templates: TemplateDefinition[] }>("/templates");
  }

  /** One templateKey per profession — the most-used non-Classic template for that profession, once it clears a minimum sample size. See worker's popularTemplates.ts. Feeds the template picker's "most popular with <profession>" indicator. */
  popularTemplatesByProfession() {
    return this.get<{ popularTemplates: Record<string, string> }>("/templates/popular-by-profession");
  }

  listPlans() {
    return this.get<{ plans: SubscriptionPlan[] }>("/subscriptions/plans");
  }

  /** "Skills & Tools" picker suggestions (Edit Resume, Portrait template) for one profession — see SkillsAndToolsEditor.tsx. */
  listSkillSuggestions(professionKey: string) {
    return this.get<{ skillSuggestions: SkillSuggestion[] }>(`/skill-suggestions?profession=${encodeURIComponent(professionKey)}`);
  }

  /** Downgrade only — paid tiers go through checkout() below. */
  changeTier(tier: string) {
    return this.post<{ user: unknown }>("/subscriptions/change-tier", { tier });
  }

  /** Starts a Stripe Checkout session for upgrading to a paid tier. Redirect the browser to the returned url. */
  checkout(tier: "professional" | "premium") {
    return this.post<{ url: string }>("/subscriptions/checkout", { tier });
  }

  /** Opens Stripe's hosted Billing Portal (manage payment method, switch plan, cancel). */
  billingPortal() {
    return this.post<{ url: string }>("/subscriptions/portal");
  }

  /** Self-service "Cancel subscription" (Profile page) — cancels at the end of the current billing period, not immediately. */
  cancelSubscription() {
    return this.post<{ user: AuthUser }>("/subscriptions/cancel");
  }

  /** Undoes a pending cancellation while the current period hasn't ended yet. */
  resumeSubscription() {
    return this.post<{ user: AuthUser }>("/subscriptions/resume");
  }

  dashboardSummary() {
    return this.get<DashboardSummary>("/dashboard/summary");
  }

  /** Never takes a password anymore — see unlockPasswordProtectedResume below. A password-protected resume just comes back with a 403/"password" reason on this plain load. */
  getPublicResume(slug: string) {
    return this.get<{ resume: PublicResume }>(`/public/${slug}`);
  }

  /**
   * POST body, not `getPublicResume(slug, password)`'s old `?password=`
   * query string (Sep 2026 security pass) — a password sitting in a URL
   * leaks into server access logs, browser history, and any Referer header
   * sent onward. Same fix as unlockRecruiterCard below, just for the
   * resume's own password this time.
   */
  unlockPasswordProtectedResume(slug: string, password: string) {
    return this.post<{ resume: PublicResume }>(`/public/${slug}/password`, { password });
  }

  /**
   * POST body, not a query string — deliberately unlike getPublicResume's
   * password param above, since a recruiter code sitting in a URL would leak
   * into server logs, browser history, and any Referer header. `password` is
   * only needed here for a Private/password-protected resume (the code is an
   * additional gate stacked on top of that, never a substitute for it — see
   * ResumeService.unlockRecruiterCard).
   */
  unlockRecruiterCard(slug: string, code: string, password?: string) {
    return this.post<{ recruiterCard: RecruiterCard }>(`/public/${slug}/recruiter-card`, { code, password });
  }
}
