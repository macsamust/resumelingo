import { TemplateDefinition, TemplateRecord } from "../types";

/**
 * Seed data only, used once (see db/database.ts's seedCatalogDefaults) to
 * populate the "templates" table the first time an install boots. Once
 * seeded, the DB table — not this array — is the source of truth; admins
 * edit templates via /api/admin/templates (see repositories/TemplateRepository.ts),
 * and the rest of the app reads through the in-memory cache below.
 */
export const DEFAULT_TEMPLATES: TemplateDefinition[] = [
  { key: "executive", name: "Executive", description: "Polished layout for senior leadership roles." },
  { key: "modern", name: "Modern", description: "Clean, contemporary layout with accent color." },
  { key: "classic", name: "Classic", description: "Traditional, conservative resume format." },
  { key: "government", name: "Government", description: "Formatted for public-sector applications." },
  { key: "federal", name: "Federal", description: "Detailed federal resume format (USAJobs-ready)." },
  { key: "technical", name: "Technical", description: "Skills-forward layout for engineering roles." },
  { key: "creative", name: "Creative", description: "Expressive layout for design and creative fields." },
  { key: "minimalist", name: "Minimalist", description: "Distraction-free, whitespace-forward layout." },
  { key: "consulting", name: "Consulting", description: "Achievement-and-metrics-driven format." },
  { key: "military-transition", name: "Military Transition", description: "Translates military experience to civilian roles." },
  { key: "corporate", name: "Corporate", description: "Formal layout suited to large organizations." },
  { key: "startup", name: "Startup", description: "Fast-paced, impact-driven layout." },
  { key: "healthcare", name: "Healthcare", description: "Clinical experience and licensure forward." },
  { key: "academic", name: "Academic", description: "CV-style layout for education and research." },
  { key: "government-contractor", name: "Government Contractor", description: "Highlights clearance and contract vehicles." },
];

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
    .map((t) => ({ key: t.key, name: t.name, description: t.description }));
}

/**
 * Looks up a template by key regardless of enabled state, so a resume
 * already using a since-disabled template still renders its name.
 */
export function getTemplateByKey(key: string): TemplateDefinition | undefined {
  const t = cache.find((t) => t.key === key);
  return t ? { key: t.key, name: t.name, description: t.description } : undefined;
}
