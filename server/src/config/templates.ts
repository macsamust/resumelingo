import { TemplateDefinition } from "../types";

export const TEMPLATES: TemplateDefinition[] = [
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

export function getTemplateByKey(key: string): TemplateDefinition | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
