/**
 * Curated "Skills & Tools" suggestions per profession (Edit Resume,
 * Portrait template only — see components/builder/SkillsAndToolsEditor.tsx
 * and ResumePreview.tsx's photo-banner-sidebar family). Reads as
 * AI-suggested keywords to the person using it, but is deliberately a
 * static, deterministic lookup table rather than a live model call — same
 * "reads like AI but isn't" approach as ContentGenerator.ts,
 * CoverLetterGenerator.ts, and CareerCoachGenerator.ts elsewhere in this
 * app (no network AI dependency anywhere, by design, for cost and latency).
 *
 * Keyed by the same profession key strings the rest of the app already
 * uses (config/professions.ts on the server, ProfessionSummary.key on the
 * client). "skills" are softer/transferable capabilities; "tools" are
 * named systems, software, or certifications — the same split the picker
 * UI and the Portrait sidebar both group by.
 */
export interface SkillsAndToolsSuggestions {
  skills: string[];
  tools: string[];
}

export const SKILLS_AND_TOOLS_SUGGESTIONS: Record<string, SkillsAndToolsSuggestions> = {
  "software-engineer": {
    skills: [
      "Problem solving",
      "System design",
      "Code review",
      "Debugging",
      "Mentoring",
      "Technical writing",
      "Cross-team collaboration",
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
      "Cross-functional leadership",
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
      "Cross-functional coordination",
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

/** Falls back to the "other" catch-all list for a profession key with no dedicated suggestions yet. */
export function getSkillsAndToolsSuggestions(professionKey: string): SkillsAndToolsSuggestions {
  return SKILLS_AND_TOOLS_SUGGESTIONS[professionKey] ?? SKILLS_AND_TOOLS_SUGGESTIONS.other;
}
