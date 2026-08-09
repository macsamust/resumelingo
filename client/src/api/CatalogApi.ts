import { ApiClient } from "./ApiClient";
import { DashboardSummary, ProfessionDefinition, ProfessionSummary, PublicResume, SkillSuggestion, SubscriptionPlan, TemplateDefinition } from "../types";

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

  dashboardSummary() {
    return this.get<DashboardSummary>("/dashboard/summary");
  }

  getPublicResume(slug: string, password?: string) {
    const suffix = password ? `?password=${encodeURIComponent(password)}` : "";
    return this.get<{ resume: PublicResume }>(`/public/${slug}${suffix}`);
  }
}
