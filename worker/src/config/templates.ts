import { SubscriptionTier, TemplateCategory, TemplateDefinition } from "../types";

export const TEMPLATES: TemplateDefinition[] = [
  { key: "executive", name: "Executive", description: "Polished layout for senior leadership roles.", category: TemplateCategory.Upgrade },
  { key: "modern", name: "Modern", description: "Clean, contemporary layout with accent color.", category: TemplateCategory.Basic },
  { key: "classic", name: "Classic", description: "Traditional, conservative resume format.", category: TemplateCategory.Basic },
  { key: "government", name: "Govt", description: "Formatted for public sector applications.", category: TemplateCategory.Upgrade },
  { key: "federal", name: "Federal", description: "Detailed federal resume format (USAJobs ready).", category: TemplateCategory.Upgrade },
  { key: "technical", name: "Technical", description: "Skills forward layout for engineering roles.", category: TemplateCategory.Upgrade },
  { key: "creative", name: "Creative", description: "Expressive layout for design and creative fields.", category: TemplateCategory.Premium },
  { key: "minimalist", name: "Minimalist", description: "Distraction free, whitespace forward layout.", category: TemplateCategory.Basic },
  { key: "consulting", name: "Consulting", description: "Achievement and metrics driven format.", category: TemplateCategory.Upgrade },
  { key: "military-transition", name: "Military Transition", description: "Translates military experience to civilian roles.", category: TemplateCategory.Upgrade },
  { key: "corporate", name: "Corporate", description: "Formal layout suited to large organizations.", category: TemplateCategory.Basic },
  { key: "startup", name: "Startup", description: "Fast paced, impact driven layout.", category: TemplateCategory.Basic },
  { key: "healthcare", name: "Healthcare", description: "Clinical experience and licensure forward.", category: TemplateCategory.Upgrade },
  { key: "academic", name: "Academic", description: "CV style layout for education and research.", category: TemplateCategory.Premium },
  { key: "government-contractor", name: "Govt Contractor", description: "Highlights clearance and contract vehicles.", category: TemplateCategory.Premium },
  { key: "timeline", name: "Timeline", description: "Full width name banner over a contact and skills sidebar, with an icon marker career timeline.", category: TemplateCategory.Upgrade },
  { key: "portrait", name: "Portrait", description: "Colored photo banner over badge marked work history, with a skills and volunteer work sidebar.", category: TemplateCategory.Premium },
  { key: "designer", name: "Designer", description: "Bold circular photo with an accent color corner block, a contact and education sidebar, and bar style section headers.", category: TemplateCategory.Premium },
  { key: "monochrome", name: "Monochrome", description: "Grayscale photo beside a light gray sidebar for contact, education, and skills, with clean underlined section headers.", category: TemplateCategory.Premium },
  { key: "showcase", name: "Showcase", description: "Photo header over a grid of bordered cards, each tagged with a colorful pill style section label.", category: TemplateCategory.Premium },
  { key: "framed", name: "Framed", description: "Circular photo beside a bordered name box on a solid navy header, with a light Contact/Education/Skills sidebar.", category: TemplateCategory.Premium },
  { key: "emblem", name: "Emblem", description: "Full width navy header with a centered gold monogram and bordered name box, over a Contact/Education/Skills sidebar.", category: TemplateCategory.Premium },
  { key: "spotlight", name: "Spotlight", description: "Circular photo beside the name on a colored banner header, with Hard Skills/Soft Skills and Workshops & Training sections.", category: TemplateCategory.Premium },
  { key: "boardroom", name: "Boardroom", description: "Full width navy and gold banner header with a bold serif name, for senior and board level roles. Single column and ATS friendly.", category: TemplateCategory.Premium },
  { key: "ats-optimized", name: "ATS Optimized", description: "Single column, plain section headers, and no photos or graphics, built to parse cleanly through applicant tracking systems.", category: TemplateCategory.Premium },
  { key: "profile", name: "Profile", description: "Oversized name and a dotted photo header, over a clean two-column Experience and Education list.", category: TemplateCategory.Premium },
];

export function getTemplateByKey(key: string): TemplateDefinition | undefined {
  return TEMPLATES.find((t) => t.key === key);
}

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
