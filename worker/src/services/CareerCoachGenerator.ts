/**
 * Rule-based "AI Career Coach" — same "reads like AI, is actually
 * deterministic template logic" approach as ContentGenerator.ts,
 * CoverLetterGenerator.ts, and ThankYouLetterGenerator.ts (see those files
 * for why: no LLM/network call wired into this app, so answering has to
 * stay instant, free to run, and offline-safe). A typed question gets
 * classified into one of three supported topics by keyword matching, then
 * answered from a fixed set of hand-written templates — not a general
 * chatbot, and deliberately honest about that in the "general" fallback.
 */

export type CareerCoachTopic = "salary" | "interview" | "certifications" | "general";

export interface CareerCoachAnswer {
  topic: CareerCoachTopic;
  answer: string;
  relatedLinks: { label: string; anchor: string }[];
}

export interface ICareerCoachGenerator {
  answer(question: string, professionLabel?: string, professionKey?: string): CareerCoachAnswer;
}

const SALARY_PATTERN = /salary|compensation|\bpay\b|negotiat|\braise\b|\boffer\b|\bwage/i;
const INTERVIEW_PATTERN = /interview|behavioral question|tell me about yourself|weakness|strength|star method/i;
const CERTIFICATION_PATTERN = /certif|credential|licens|\bcourse\b|upskill/i;

/** Curated, widely-recognized certifications per profession key (see config/professions.ts) — not exhaustive, just a sane starting point. */
const CERTIFICATION_SUGGESTIONS: Record<string, string[]> = {
  "software-engineer": [
    "AWS Certified Solutions Architect",
    "Microsoft Certified: Azure Developer Associate",
    "Certified Kubernetes Administrator (CKA)",
  ],
  nurse: ["Basic Life Support (BLS)", "Advanced Cardiac Life Support (ACLS)", "A specialty certification matching your unit (e.g. CCRN for critical care)"],
  teacher: ["State teaching license/endorsement renewal", "National Board Certification", "A subject-specific credential (e.g. TESOL for ESL)"],
  executive: ["An executive leadership program (e.g. an Advanced Management Program)", "A board readiness or corporate governance certification"],
  "project-manager": ["PMP (Project Management Professional)", "Certified ScrumMaster (CSM)", "PRINCE2 Foundation"],
  "government-contractor": ["A relevant DAWIA or FAC-C certification for your role", "Security+ if you're in a cleared IT role"],
  military: ["A civilian-equivalent credential for your MOS (check your branch's COOL program)", "PMP or Six Sigma if you're moving into a management-track civilian role"],
  sales: ["A CRM platform certification (e.g. Salesforce Certified Sales Cloud Consultant)", "Certified Sales Professional (CSP)"],
  marketing: ["Google Analytics / Google Ads certification", "HubSpot Inbound Marketing Certification"],
  construction: ["OSHA 30", "A trade-specific license or certification for your specialty"],
};

function salaryAnswer(): string {
  return [
    "Research your number from a few sources — Glassdoor, levels.fyi or Payscale, and the pay range on the job posting itself if one's listed (most now include one).",
    "Let the employer name a number first if you can. Once an offer is on the table, they've already decided you're right for the role — that's your strongest leverage point.",
    "Anchor slightly above your real target, not at it, so there's room to negotiate down without landing below what you actually want.",
    "If the base salary is fixed, negotiate the rest — signing bonus, extra PTO, remote/hybrid flexibility, or an earlier performance review can all carry real value.",
  ].join("\n\n");
}

function interviewAnswer(rawQuestion: string): string {
  // Best-effort personalization: if there's real content beyond the trigger
  // phrase itself, treat the whole message as the actual interview question
  // being asked about and quote it back.
  const isJustTheTriggerPhrase = rawQuestion.trim().length < 25;
  const intro = isJustTheTriggerPhrase
    ? "Here's a structure that works for almost any behavioral interview question:"
    : `For a question like "${rawQuestion.trim()}", here's a structure that works for almost any behavioral interview question:`;

  return [
    intro,
    "Situation — set the scene in one or two sentences: what was the context.",
    "Task — what you were specifically responsible for or trying to achieve.",
    "Action — the steps YOU took, in some detail. This is the part interviewers weigh most heavily.",
    "Result — what happened, ideally with a number attached (time saved, revenue, error rate, team impact).",
    "Keep the whole answer to 60–90 seconds out loud, and practice it once or twice so it doesn't sound rehearsed when you actually say it.",
  ].join("\n\n");
}

function certificationsAnswer(professionLabel?: string, professionKey?: string): string {
  const suggestions = professionKey ? CERTIFICATION_SUGGESTIONS[professionKey] : undefined;
  if (suggestions && suggestions.length > 0) {
    const intro = professionLabel
      ? `For ${professionLabel}, a few certifications that consistently stand out:`
      : "A few certifications that consistently stand out:";
    return [intro, ...suggestions.map((s) => `• ${s}`)].join("\n");
  }
  return [
    "Look at 3–5 job postings for the role you want next and note which certifications keep showing up under \"preferred qualifications\" — that's usually a stronger, more current signal than any generic list.",
    "Prioritize certifications tied to a specific tool or platform you'd actually use day to day over broad ones — they're faster to earn and easier for a hiring manager to see the direct relevance of.",
    "Check whether your current employer offers reimbursement for exam fees or study time before paying out of pocket.",
  ].join("\n\n");
}

function classify(question: string): CareerCoachTopic {
  if (SALARY_PATTERN.test(question)) return "salary";
  if (INTERVIEW_PATTERN.test(question)) return "interview";
  if (CERTIFICATION_PATTERN.test(question)) return "certifications";
  return "general";
}

export class RuleBasedCareerCoachGenerator implements ICareerCoachGenerator {
  answer(question: string, professionLabel?: string, professionKey?: string): CareerCoachAnswer {
    const topic = classify(question);
    switch (topic) {
      case "salary":
        return {
          topic,
          answer: salaryAnswer(),
          relatedLinks: [{ label: "Salary Negotiation guide", anchor: "salary-negotiation" }],
        };
      case "interview":
        return {
          topic,
          answer: interviewAnswer(question),
          relatedLinks: [{ label: "Interview Tips guide", anchor: "interview-tips" }],
        };
      case "certifications":
        return {
          topic,
          answer: certificationsAnswer(professionLabel, professionKey),
          relatedLinks: [{ label: "Career Planning guide", anchor: "career-planning" }],
        };
      case "general":
      default:
        return {
          topic: "general",
          answer:
            "I can help most with salary negotiation, interview prep, and certification suggestions right now. Try rephrasing your question around one of those — or browse the Career Center for broader guidance on networking, promotions, and career planning.",
          relatedLinks: [{ label: "Browse the Career Center", anchor: "" }],
        };
    }
  }
}
