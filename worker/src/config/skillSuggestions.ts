/**
 * Suggestion keywords feeding the Edit Resume "Skills & Tools" picker
 * (Portrait template — see client's SkillsAndToolsEditor.tsx), grouped by
 * profession and skill-vs-tool category. Reads as "AI-generated" to the
 * person using it, but is actually a curated, deterministic list — same
 * data server/ seeds its admin-editable "skill_suggestions" table from (see
 * server/src/config/skillSuggestions.ts). The admin console is out of scope
 * for this port, so this stays a plain static array instead of a DB table.
 */
export interface SkillSuggestion {
  id: string;
  professionKey: string;
  label: string;
  category: "skill" | "tool";
}

const SEED_LISTS: Record<string, { skills: string[]; tools: string[] }> = {
  "software-engineer": {
    skills: [
      "Problem solving",
      "System design",
      "Code review",
      "Debugging",
      "Mentoring",
      "Technical writing",
      "Cross team collaboration",
      "Performance tuning",
    ],
    tools: ["TypeScript", "Python", "React", "Node.js", "Docker", "Kubernetes", "AWS", "PostgreSQL", "Git", "CI/CD"],
  },
  nurse: {
    skills: [
      "Patient assessment",
      "Care coordination",
      "Critical thinking",
      "Bedside manner",
      "Triage",
      "Patient education",
      "Team leadership",
      "Crisis response",
    ],
    tools: ["Epic", "Cerner", "IV therapy", "EKG monitoring", "BLS", "ACLS", "Medication administration"],
  },
  teacher: {
    skills: [
      "Lesson planning",
      "Classroom management",
      "Differentiated instruction",
      "Student assessment",
      "Parent communication",
      "Curriculum design",
      "Behavior management",
    ],
    tools: ["Google Classroom", "Canvas", "Smartboards", "IEP compliance", "Standardized testing", "Zoom"],
  },
  executive: {
    skills: [
      "Strategic planning",
      "P&L ownership",
      "Change management",
      "Board reporting",
      "Cross functional leadership",
      "M&A",
      "Stakeholder management",
    ],
    tools: ["Budget forecasting", "OKRs", "Salesforce", "Tableau", "Workday"],
  },
  "project-manager": {
    skills: [
      "Stakeholder management",
      "Risk management",
      "Resource planning",
      "Budget management",
      "Cross functional coordination",
      "Status reporting",
    ],
    tools: ["Jira", "Asana", "MS Project", "Confluence", "Agile", "Scrum", "PMP", "Waterfall"],
  },
  "government-contractor": {
    skills: [
      "Compliance management",
      "Proposal writing",
      "Contract negotiation",
      "Program management",
      "Stakeholder coordination",
    ],
    tools: ["FAR/DFAR", "Security clearance", "SharePoint", "Deltek Costpoint", "Earned value management"],
  },
  military: {
    skills: [
      "Leadership",
      "Operations planning",
      "Team training",
      "Crisis management",
      "Logistics coordination",
      "Discipline under pressure",
    ],
    tools: ["Security clearance", "Tactical planning software", "Risk assessment", "Equipment maintenance"],
  },
  sales: {
    skills: [
      "Relationship building",
      "Negotiation",
      "Pipeline management",
      "Consultative selling",
      "Account growth",
      "Objection handling",
    ],
    tools: ["Salesforce", "HubSpot", "Outreach", "LinkedIn Sales Navigator", "ZoomInfo"],
  },
  marketing: {
    skills: [
      "Campaign strategy",
      "Brand positioning",
      "Content strategy",
      "A/B testing",
      "Audience segmentation",
      "Copywriting",
    ],
    tools: ["HubSpot", "Google Analytics", "SEO", "Meta Ads", "Mailchimp", "Figma"],
  },
  construction: {
    skills: [
      "Site safety",
      "Crew supervision",
      "Blueprint reading",
      "Quality control",
      "Scheduling",
      "Vendor coordination",
    ],
    tools: ["OSHA 30", "AutoCAD", "Procore", "Heavy equipment operation", "Building codes"],
  },
  other: {
    skills: ["Problem solving", "Communication", "Time management", "Adaptability", "Collaboration", "Attention to detail"],
    tools: ["Microsoft Office", "Google Workspace", "Slack", "Excel"],
  },
};

/** Flattened, with a stable id derived from profession+category+position (no DB row to generate one from). */
export const SKILL_SUGGESTIONS: SkillSuggestion[] = Object.entries(SEED_LISTS).flatMap(([professionKey, lists]) => [
  ...lists.skills.map((label, i) => ({ id: `${professionKey}-skill-${i}`, professionKey, label, category: "skill" as const })),
  ...lists.tools.map((label, i) => ({ id: `${professionKey}-tool-${i}`, professionKey, label, category: "tool" as const })),
]);

export function listSkillSuggestions(professionKey?: string): SkillSuggestion[] {
  if (!professionKey) return SKILL_SUGGESTIONS;
  return SKILL_SUGGESTIONS.filter((s) => s.professionKey === professionKey);
}
