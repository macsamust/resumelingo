import { SubscriptionTier, TemplateCategory, TemplateDefinition, TemplateRecord } from "../types";

/**
 * Seed data only, used once (see db/database.ts's seedCatalogDefaults) to
 * populate the "templates" table the first time an install boots. Once
 * seeded, the DB table — not this array — is the source of truth; admins
 * edit templates via /api/admin/templates (see repositories/TemplateRepository.ts),
 * and the rest of the app reads through the in-memory cache below.
 */
export const DEFAULT_TEMPLATES: TemplateDefinition[] = [
  { key: "executive", name: "Executive", description: "Polished layout for senior leadership roles.", category: TemplateCategory.Upgrade },
  { key: "modern", name: "Modern", description: "Clean, contemporary layout with accent color.", category: TemplateCategory.Basic },
  { key: "classic", name: "Classic", description: "Traditional, conservative resume format.", category: TemplateCategory.Basic },
  { key: "government", name: "Government", description: "Formatted for public-sector applications.", category: TemplateCategory.Upgrade },
  { key: "federal", name: "Federal", description: "Detailed federal resume format (USAJobs-ready).", category: TemplateCategory.Premium },
  { key: "technical", name: "Technical", description: "Skills-forward layout for engineering roles.", category: TemplateCategory.Upgrade },
  { key: "creative", name: "Creative", description: "Expressive layout for design and creative fields.", category: TemplateCategory.Premium },
  { key: "minimalist", name: "Minimalist", description: "Distraction-free, whitespace-forward layout.", category: TemplateCategory.Basic },
  { key: "consulting", name: "Consulting", description: "Achievement-and-metrics-driven format.", category: TemplateCategory.Upgrade },
  { key: "military-transition", name: "Military Transition", description: "Translates military experience to civilian roles.", category: TemplateCategory.Premium },
  { key: "corporate", name: "Corporate", description: "Formal layout suited to large organizations.", category: TemplateCategory.Basic },
  { key: "startup", name: "Startup", description: "Fast-paced, impact-driven layout.", category: TemplateCategory.Basic },
  { key: "healthcare", name: "Healthcare", description: "Clinical experience and licensure forward.", category: TemplateCategory.Upgrade },
  { key: "academic", name: "Academic", description: "CV-style layout for education and research.", category: TemplateCategory.Premium },
  { key: "government-contractor", name: "Government Contractor", description: "Highlights clearance and contract vehicles.", category: TemplateCategory.Premium },
  { key: "timeline", name: "Timeline", description: "Full-width name banner over a contact-and-skills sidebar, with an icon-marker career timeline.", category: TemplateCategory.Upgrade },
  { key: "portrait", name: "Portrait", description: "Colored photo banner over badge-marked work history, with a skills-and-volunteer-work sidebar.", category: TemplateCategory.Premium },
  { key: "designer", name: "Designer", description: "Bold circular photo with an accent-color corner block, a contact-and-expertise sidebar, and bar-style section headers.", category: TemplateCategory.Premium },
];

/** Ranked 1:1 with TemplateCategory below — higher tier can use anything at or below its rank. */
const TIER_RANK: Record<SubscriptionTier, number> = {
  [SubscriptionTier.Starter]: 0,
  [SubscriptionTier.Professional]: 1,
  [SubscriptionTier.Premium]: 2,
};

const CATEGORY_RANK: Record<TemplateCategory, number> = {
  [TemplateCategory.Basic]: 0,
  [TemplateCategory.Upgrade]: 1,
  [TemplateCategory.Premium]: 2,
};

/** The cheapest subscription tier that can use a template of this category — used for "Upgrade to X" messaging. */
export const CATEGORY_MIN_TIER: Record<TemplateCategory, SubscriptionTier> = {
  [TemplateCategory.Basic]: SubscriptionTier.Starter,
  [TemplateCategory.Upgrade]: SubscriptionTier.Professional,
  [TemplateCategory.Premium]: SubscriptionTier.Premium,
};

/** Whether a subscriber at `tier` is allowed to select/keep a template categorized as `category`. */
export function canUseTemplate(tier: SubscriptionTier, category: TemplateCategory): boolean {
  return TIER_RANK[tier] >= CATEGORY_RANK[category];
}

/**
 * In-memory cache of ALL templates (enabled and disabled), populated at boot
 * (see index.ts) and refreshed after every admin write (see
 * repositories/TemplateRepository.ts). Kept as a synchronous cache — rather
 * than making every caller async — because Resume.ts's `template` getter is
 * called synchronously from toJSON()/toPublicJSON(), including in tight
 * loops (e.g. the dashboard summary mapping over many resumes). A resume
 * keeps resolving its template's name even after an admin disables it —
 * only the public "choose a template" list (listTemplates) hides disabled
 * ones from new selection.
 */
let cache: TemplateRecord[] = [];

export function setTemplateCache(templates: TemplateRecord[]): void {
  cache = templates;
}

/** Enabled templates only — what users are offered to choose from. */
export function listTemplates(): TemplateDefinition[] {
  return cache
    .filter((t) => t.enabled)
    .map((t) => ({ key: t.key, name: t.name, description: t.description, category: t.category }));
}

/**
 * Looks up a template by key regardless of enabled state, so a resume
 * already using a since-disabled template still renders its name.
 */
export function getTemplateByKey(key: string): TemplateDefinition | undefined {
  const t = cache.find((t) => t.key === key);
  return t ? { key: t.key, name: t.name, description: t.description, category: t.category } : undefined;
}
