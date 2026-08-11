import { WorkExperienceEntry } from "../types";

export interface CoverLetterInput {
  fullName: string;
  /** Resume title (e.g. "Senior Product Manager Resume") — used as the role named in the opening line; falls back to professionLabel when blank. */
  title: string;
  professionLabel: string;
  /** The resume's own generated About/Summary statement, woven into the opening paragraph so the two documents read consistently. */
  summary: string;
  /** Most recent/current role, if any, called out in the second sentence. */
  topExperience?: WorkExperienceEntry;
}

export interface ICoverLetterGenerator {
  generate(input: CoverLetterInput): string;
}

/**
 * Rule-based cover letter generator — the same "reads like AI, is actually
 * deterministic template logic" approach as ContentGenerator.ts. Identical
 * to the Node/Express version — no I/O. Only ever invoked for resumes on a
 * Premium-tier template with the "Generate AI cover letter" checkbox on —
 * see ResumeService.create/update.
 */
export class RuleBasedCoverLetterGenerator implements ICoverLetterGenerator {
  generate({ fullName, title, professionLabel, summary, topExperience }: CoverLetterInput): string {
    const name = fullName.trim() || "Applicant";
    const roleLine = title.trim() || professionLabel;

    const opening = `I am writing to express my interest in ${roleLine} opportunities. ${summary}`.trim();

    const experienceLine = topExperience
      ? ` Most recently, I served as ${topExperience.title || "a professional"}${
          topExperience.company ? ` at ${topExperience.company}` : ""
        }, where I sharpened my ability to deliver results under pressure and collaborate effectively across teams.`
      : "";

    const closing =
      "I would welcome the opportunity to discuss how my background and skills align with your team's needs. Thank you for your time and consideration.";

    return ["Dear Hiring Manager,", "", `${opening}${experienceLine}`, "", closing, "", "Sincerely,", name].join("\n");
  }
}

/**
 * Current role if any, else the first entry — same "most relevant first"
 * heuristic as the client's ResumePreview.tsx sortByDateRange, kept simple
 * here since a cover letter only ever calls out one role.
 */
export function pickTopExperience(experience: WorkExperienceEntry[]): WorkExperienceEntry | undefined {
  if (experience.length === 0) return undefined;
  return experience.find((e) => e.current) ?? experience[0];
}
