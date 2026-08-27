/**
 * "AI Career Coach" — was rule-based keyword matching against a fixed set of
 * hand-written templates (kept below as RuleBasedCareerCoachGenerator, no
 * longer wired up by default); now a real Workers AI call, following the
 * same "answer as structured JSON, tolerate the model's formatting quirks,
 * sanitize before trusting anything" approach as ResumeImportService and
 * AchievementGeneratorService. Topic classification still ends up
 * deterministic on this side (see sanitizeTopic/TOPIC_LINKS below) even
 * though the model chooses it, so `relatedLinks` can never point anywhere
 * except one of the four known Career Center anchors, regardless of what
 * the model returns.
 */

export type CareerCoachTopic = "salary" | "interview" | "certifications" | "general";

export interface CareerCoachAnswer {
  topic: CareerCoachTopic;
  answer: string;
  relatedLinks: { label: string; anchor: string }[];
}

export interface ICareerCoachGenerator {
  answer(question: string, professionLabel?: string, professionKey?: string): Promise<CareerCoachAnswer>;
}

export class CareerCoachGenerateError extends Error {}

const MAX_ANSWER_LENGTH = 3000;

const TOPIC_LINKS: Record<CareerCoachTopic, { label: string; anchor: string }[]> = {
  salary: [{ label: "Salary Negotiation guide", anchor: "salary-negotiation" }],
  interview: [{ label: "Interview Tips guide", anchor: "interview-tips" }],
  certifications: [{ label: "Career Planning guide", anchor: "career-planning" }],
  general: [{ label: "Browse the Career Center", anchor: "" }],
};

const SYSTEM_PROMPT = `You are ResumeLingo's AI Career Coach — a focused career-advice assistant for logged-in subscribers, not a general-purpose chatbot. You help with three things specifically: salary negotiation, interview preparation, and professional certifications — plus general career-growth questions (networking, promotions, career planning) that don't fit those three but are still genuinely about someone's job or career.

You're given the user's question and, if known, their profession. Answer directly and practically in a warm, encouraging, concise tone — a few short paragraphs or a short bulleted list, whichever fits the question best. Personalize to the specific question and profession given; don't pad with generic filler that could apply to any question.

If the question isn't actually about careers or jobs at all (e.g. it's asking for code, unrelated personal advice, trivia, or anything outside career coaching), don't answer it — instead, briefly and politely explain that you're focused on career coaching and invite them to ask something in that space instead.

Respond with ONLY a single JSON object (no prose, no markdown code fence) matching exactly this shape:
{ "topic": "salary" | "interview" | "certifications" | "general", "answer": string }

"topic" is the single best-fitting category for this question — use "general" for legitimate career questions that aren't specifically about salary, interviews, or certifications, and also for off-topic questions you're declining to answer.`;

function truthy(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanString(value: unknown, maxLen: number): string {
  if (!truthy(value)) return "";
  return value.trim().slice(0, maxLen);
}

function sanitizeTopic(value: unknown): CareerCoachTopic {
  return value === "salary" || value === "interview" || value === "certifications" || value === "general" ? value : "general";
}

/** Same tolerant-parsing approach as ResumeImportService.parseModelJson — not shared into a common util since the two services' error types/messages differ and each is small enough to stay self-contained. */
function parseModelJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new CareerCoachGenerateError("The AI didn't return a recognizable answer. Try asking again.");
  }
  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    console.error("CareerCoachGenerator: JSON.parse failed on model output:", text);
    throw new CareerCoachGenerateError("The AI's answer couldn't be read. Try asking again.");
  }
}

/** Same three response shapes as ResumeImportService.extractParsedJson — see that file's doc comment for why Workers AI needs this tolerance. */
function extractParsedJson(response: unknown): Record<string, unknown> {
  const r = response as {
    response?: unknown;
    choices?: { message?: { content?: unknown } }[];
  };

  if (r?.response && typeof r.response === "object") {
    return r.response as Record<string, unknown>;
  }
  if (typeof r?.response === "string" && r.response.trim()) {
    return parseModelJson(r.response);
  }
  const choiceContent = r?.choices?.[0]?.message?.content;
  if (typeof choiceContent === "string" && choiceContent.trim()) {
    return parseModelJson(choiceContent);
  }

  console.error("CareerCoachGenerator: unrecognized Workers AI response shape:", JSON.stringify(response));
  throw new CareerCoachGenerateError("The AI didn't return an answer. Try asking again.");
}

export class AiCareerCoachGenerator implements ICareerCoachGenerator {
  constructor(private readonly ai: Ai) {}

  async answer(question: string, professionLabel?: string): Promise<CareerCoachAnswer> {
    const userContent = [professionLabel ? `User's profession: ${professionLabel}` : undefined, `Question: ${question}`]
      .filter(Boolean)
      .join("\n");

    let response: unknown;
    try {
      response = await this.ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.5,
        max_tokens: 700,
      });
    } catch (err) {
      throw new CareerCoachGenerateError(
        `Couldn't reach the AI Career Coach (${err instanceof Error ? err.message : "unknown error"}). Try again in a moment.`
      );
    }

    const parsed = extractParsedJson(response);
    const topic = sanitizeTopic(parsed.topic);
    const answer =
      cleanString(parsed.answer, MAX_ANSWER_LENGTH) || "Sorry, I couldn't come up with an answer for that. Try rephrasing your question.";
    return { topic, answer, relatedLinks: TOPIC_LINKS[topic] };
  }
}

// ---------------------------------------------------------------------------
// Below: the original deterministic implementation, kept for tests/reference
// and as a fallback that's easy to swap back in (see createServices.ts) if
// Workers AI ever needs to come out of the loop for this feature again.
// ---------------------------------------------------------------------------

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
  async answer(question: string, professionLabel?: string, professionKey?: string): Promise<CareerCoachAnswer> {
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
