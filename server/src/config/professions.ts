import { ProfessionDefinition } from "../types";

/**
 * Selecting a profession changes the questions the Resume Builder asks.
 * This mirrors the "system interviews you" flow described in the Websume
 * product overview: each field gets a tailored question set instead of a
 * blank text box.
 */
export const PROFESSIONS: ProfessionDefinition[] = [
  {
    key: "software-engineer",
    label: "Software Engineer",
    questions: [
      { key: "languages", label: "Languages", type: "list", placeholder: "TypeScript, C#, Python" },
      { key: "frameworks", label: "Frameworks", type: "list", placeholder: "React, .NET, Django" },
      { key: "cloudPlatforms", label: "Cloud Platforms", type: "list", placeholder: "Azure, AWS" },
      { key: "certifications", label: "Certifications", type: "list" },
      { key: "methodologies", label: "Methodologies", type: "list", placeholder: "Agile, Scrum" },
      { key: "devOps", label: "DevOps", type: "text" },
      { key: "ciCd", label: "CI/CD", type: "text" },
      { key: "security", label: "Security", type: "text" },
      { key: "gitHub", label: "GitHub", type: "text", placeholder: "Profile URL" },
      { key: "yearsExperience", label: "Years of Experience", type: "number" },
    ],
  },
  {
    key: "nurse",
    label: "Nurse",
    questions: [
      { key: "licenses", label: "Licenses", type: "list", placeholder: "RN, BSN" },
      { key: "specialties", label: "Specialties", type: "list", placeholder: "ICU, Pediatrics" },
      { key: "hospitals", label: "Hospitals", type: "list" },
      { key: "patientCare", label: "Patient Care", type: "textarea" },
      { key: "certifications", label: "Certifications", type: "list" },
      { key: "clinicalExperience", label: "Clinical Experience", type: "textarea" },
      { key: "shiftExperience", label: "Shift Experience", type: "text" },
      { key: "emrSystems", label: "Electronic Medical Record Systems", type: "list", placeholder: "Epic, Cerner" },
    ],
  },
  {
    key: "teacher",
    label: "Teacher",
    questions: [
      { key: "gradeLevels", label: "Grade Levels", type: "list" },
      { key: "subjects", label: "Subjects", type: "list" },
      { key: "stateCertifications", label: "State Certifications", type: "list" },
      { key: "testingExperience", label: "Testing Experience", type: "text" },
      { key: "classroomTechnology", label: "Classroom Technology", type: "list" },
      { key: "lessonPlanning", label: "Lesson Planning", type: "textarea" },
    ],
  },
  {
    key: "executive",
    label: "Executive",
    questions: [
      { key: "leadershipScope", label: "Leadership Scope", type: "textarea", placeholder: "Team size, P&L responsibility" },
      { key: "keyInitiatives", label: "Key Initiatives", type: "textarea" },
      { key: "boardExperience", label: "Board Experience", type: "text" },
      { key: "yearsExperience", label: "Years of Experience", type: "number" },
    ],
  },
  {
    key: "project-manager",
    label: "Project Manager",
    questions: [
      { key: "methodologies", label: "Methodologies", type: "list", placeholder: "Agile, Waterfall, PMP" },
      { key: "certifications", label: "Certifications", type: "list", placeholder: "PMP, CSM" },
      { key: "toolsUsed", label: "Tools Used", type: "list", placeholder: "Jira, MS Project" },
      { key: "budgetManaged", label: "Budget Managed", type: "text" },
      { key: "teamSize", label: "Team Size Led", type: "number" },
    ],
  },
  {
    key: "government-contractor",
    label: "Government Contractor",
    questions: [
      { key: "clearanceLevel", label: "Clearance Level", type: "text" },
      { key: "agenciesSupported", label: "Agencies Supported", type: "list" },
      { key: "contractVehicles", label: "Contract Vehicles", type: "list" },
      { key: "certifications", label: "Certifications", type: "list" },
    ],
  },
  {
    key: "military",
    label: "Military",
    questions: [
      { key: "branch", label: "Branch of Service", type: "text" },
      { key: "rank", label: "Rank", type: "text" },
      { key: "militaryOccupationalSpecialty", label: "Military Occupational Specialty", type: "text" },
      { key: "clearanceLevel", label: "Clearance Level", type: "text" },
      { key: "leadershipExperience", label: "Leadership Experience", type: "textarea" },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    questions: [
      { key: "quotaAttainment", label: "Quota Attainment", type: "text", placeholder: "e.g. 128% of quota" },
      { key: "territory", label: "Territory", type: "text" },
      { key: "crmTools", label: "CRM Tools", type: "list", placeholder: "Salesforce, HubSpot" },
      { key: "dealSize", label: "Average Deal Size", type: "text" },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    questions: [
      { key: "channels", label: "Channels", type: "list", placeholder: "SEO, Paid Social, Email" },
      { key: "campaignResults", label: "Campaign Results", type: "textarea" },
      { key: "toolsUsed", label: "Tools Used", type: "list", placeholder: "HubSpot, GA4" },
    ],
  },
  {
    key: "construction",
    label: "Construction",
    questions: [
      { key: "trade", label: "Trade / Specialty", type: "text" },
      { key: "certifications", label: "Certifications", type: "list", placeholder: "OSHA 30" },
      { key: "projectsCompleted", label: "Notable Projects", type: "textarea" },
      { key: "equipmentOperated", label: "Equipment Operated", type: "list" },
    ],
  },
  {
    // Catch-all for professions not covered above. Work Experience, Education,
    // Awards, and Key Achievements are already universal sections on every
    // resume (see ExperienceEditor/EducationEditor/AwardsEditor/AchievementEditor
    // in the builder) regardless of profession, so this question set only adds
    // the field that's otherwise profession-specific: Certifications.
    key: "other",
    label: "Other",
    questions: [
      { key: "certifications", label: "Certifications", type: "list", placeholder: "e.g. PMP, Six Sigma" },
      { key: "skills", label: "Skills", type: "list", placeholder: "e.g. Data Analysis, Public Speaking" },
      { key: "yearsExperience", label: "Years of Experience", type: "number" },
      { key: "additionalNotes", label: "Additional Notes", type: "textarea" },
    ],
  },
];

export function getProfessionByKey(key: string): ProfessionDefinition | undefined {
  return PROFESSIONS.find((p) => p.key === key);
}
