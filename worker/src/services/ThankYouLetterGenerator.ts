export type ThankYouScenario = "post-interview" | "offer-acceptance" | "staying-in-touch" | "networking";

/** Options shown in the "Scenario" dropdown, in display order. */
export const THANK_YOU_SCENARIOS: { key: ThankYouScenario; label: string }[] = [
  { key: "post-interview", label: "After an interview" },
  { key: "offer-acceptance", label: "Accepting a job offer" },
  { key: "staying-in-touch", label: "After a rejection (staying in touch)" },
  { key: "networking", label: "After a networking conversation" },
];

export interface ThankYouLetterInput {
  fullName: string;
  /** The user's own profession label (e.g. "Software Engineer") — used only by the "networking" scenario's second paragraph. */
  professionLabel?: string;
  company?: string;
  role?: string;
  interviewerName?: string;
  scenario: ThankYouScenario;
  /** Optional specific thing discussed, e.g. "the team's migration to microservices" — woven into the opening line when provided. */
  topic?: string;
}

export interface IThankYouLetterGenerator {
  generate(input: ThankYouLetterInput): string;
}

/**
 * Rule-based thank-you letter generator — a one-off tool (not stored on any
 * resume record) for a Premium subscriber to fill in a few specifics about
 * an interaction and get a ready-to-send note. Same "reads like AI, is
 * actually deterministic template logic" approach as ContentGenerator.ts
 * and CoverLetterGenerator.ts (see those files for why: no LLM/network call
 * wired into this app, so generation has to stay instant and offline-safe).
 */
export class RuleBasedThankYouLetterGenerator implements IThankYouLetterGenerator {
  generate(input: ThankYouLetterInput): string {
    const name = input.fullName.trim() || "Applicant";
    const greeting = `Dear ${input.interviewerName?.trim() || "Hiring Team"},`;
    const company = input.company?.trim() || "";
    const role = input.role?.trim() || "";
    const topicClause = input.topic?.trim() ? ` about ${input.topic.trim()}` : "";
    const atCompany = company ? ` at ${company}` : "";
    // Sep 2026 QA pass fix: company/role are now required upstream (see
    // ThankYouLetterController.generate), so this defensive branch should
    // never actually fire in normal use. It's kept anyway as a backstop for
    // any other caller of this generator, but built the same way `atCompany`
    // above already is — an empty string when missing, not a placeholder
    // word — so a blank role can never collide with the templates' own
    // hardcoded "the" and produce "the the role" the way the previous
    // `|| "the role"` fallback did.
    const roleClause = role ? `${role} position` : "position";

    let body: string[];
    let signOff: string;

    switch (input.scenario) {
      case "offer-acceptance":
        body = [
          `Thank you so much for offering me the ${roleClause}${atCompany}. I am thrilled to accept and excited to join the team${
            topicClause ? `, especially given our discussion${topicClause}` : ""
          }.`,
          "I appreciate the trust you've placed in me and look forward to contributing to the team's success.",
          "Please let me know if there's anything you need from me ahead of my start date.",
        ];
        signOff = "Sincerely,";
        break;

      case "staying-in-touch":
        body = [
          `Thank you for letting me know about your decision regarding the ${roleClause}${atCompany}. While I'm disappointed I won't be joining the team at this time, I genuinely enjoyed our conversation${topicClause} and learning more about your work.`,
          "I'd love to stay in touch for future opportunities that may be a better fit, and I'll be following the team's progress with interest.",
          "Thank you again for your time and consideration.",
        ];
        signOff = "Best regards,";
        break;

      case "networking":
        body = [
          `Thank you for taking the time to speak with me${topicClause}. I really valued your insights${
            company ? ` into ${company} and the industry` : " into the industry"
          }, and I appreciate you sharing your experience${input.role?.trim() ? ` as a ${role}` : ""}.`,
          `Conversations like this are incredibly helpful as I continue to grow in ${
            input.professionLabel?.trim() || "my field"
          }, and I hope to find ways to return the favor.`,
          "Thanks again for your generosity with your time.",
        ];
        signOff = "Warmly,";
        break;

      case "post-interview":
      default:
        body = [
          `Thank you for taking the time to meet with me about the ${roleClause}${atCompany}${
            topicClause ? ` and for our conversation${topicClause}` : ""
          }. I enjoyed learning more about the team and came away even more enthusiastic about the opportunity to contribute.`,
          `Our conversation reinforced that my background in ${
            input.professionLabel?.trim() || "this field"
          } aligns well with what you're looking for, and I'm confident I could make a meaningful impact from day one.`,
          "Please don't hesitate to reach out if you need any additional information. I look forward to hearing about the next steps.",
        ];
        signOff = "Warm regards,";
        break;
    }

    const lines: string[] = [greeting, ""];
    for (const paragraph of body) lines.push(paragraph, "");
    lines.push(signOff, name);
    return lines.join("\n");
  }
}
