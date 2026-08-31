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
  generate(input: CoverLetterInput): Promise<string>;
}

export class CoverLetterGenerateError extends Error {}

const MAX_PARAGRAPHS = 4;
const MAX_PARAGRAPH_LENGTH = 700;
const MAX_FIELD_LENGTH = 300;

/**
 * The salutation and sign-off are assembled here, deterministically, rather
 * than left to the model — a cover letter absolutely must open with "Dear
 * Hiring Manager," and close with the subscriber's own real name, not
 * whatever the model feels like generating. The model only ever supplies
 * the body paragraphs (see SYSTEM_PROMPT), which get spliced between those
 * two fixed lines the same way RuleBasedCoverLetterGenerator (below) always
 * did.
 */
const SYSTEM_PROMPT = `You write the body of a professional cover letter, NOT the salutation ("Dear Hiring Manager,") or the sign-off ("Sincerely, {name}"), which are added separately. You're given the person's target role, profession, their resume's own About/Summary statement, and (optionally) their most recent job title/company.

Respond with ONLY a single JSON object (no prose, no markdown code fence) matching exactly this shape:
{ "paragraphs": string[] }

Rules:
- Write 2-3 short paragraphs, first person ("I"), warm but professional tone.
- Open by expressing interest in the given role, weaving in the given summary so the letter reads consistently with the resume it accompanies.
- If a most-recent job title/company is given, mention it naturally in the second paragraph as relevant background, but never invent a company, title, achievement, or number that wasn't given.
- Close with a short paragraph welcoming the opportunity to discuss further and thanking them for their time. Do not include "Sincerely" or the person's name, that's added separately.
- Never invent any fact (employer, dates, metrics, certifications) beyond what's given in the profession, role, summary, or most-recent-role fields.
- Never mention that this was AI-generated.`;

function truthy(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanString(value: unknown, maxLen: number): string {
  if (!truthy(value)) return "";
  return value.trim().slice(0, maxLen);
}

/** Same tolerant-parsing approach as every other AI service in this codebase — not shared into a common util since each service's error type/messages differ and each is small enough to stay self-contained. */
function parseModelJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new CoverLetterGenerateError("The AI didn't return a recognizable result. Try again, or write this in by hand.");
  }
  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    console.error("CoverLetterGenerator: JSON.parse failed on model output:", text);
    throw new CoverLetterGenerateError("The AI's result couldn't be read. Try again, or write this in by hand.");
  }
}

/** Same three response shapes tolerated by every other AI service in this codebase — see ResumeImportService's doc comment for why Workers AI needs this. */
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

  console.error("CoverLetterGenerator: unrecognized Workers AI response shape:", JSON.stringify(response));
  throw new CoverLetterGenerateError("The AI didn't return a result. Try again, or write this in by hand.");
}

function sanitizeParagraphs(raw: Record<string, unknown>): string[] {
  const list = Array.isArray(raw.paragraphs) ? raw.paragraphs : [];
  return list
    .slice(0, MAX_PARAGRAPHS)
    .map((p) => cleanString(p, MAX_PARAGRAPH_LENGTH))
    .filter((p): p is string => !!p);
}

export class AiCoverLetterGenerator implements ICoverLetterGenerator {
  constructor(private readonly ai: Ai) {}

  async generate({ fullName, title, professionLabel, summary, topExperience }: CoverLetterInput): Promise<string> {
    const name = cleanString(fullName, MAX_FIELD_LENGTH) || "Applicant";
    const roleLine = cleanString(title, MAX_FIELD_LENGTH) || cleanString(professionLabel, MAX_FIELD_LENGTH);

    const userContent = [
      `Target role: ${roleLine}`,
      `Profession: ${cleanString(professionLabel, MAX_FIELD_LENGTH)}`,
      summary && `Resume summary: ${cleanString(summary, 1200)}`,
      topExperience &&
        `Most recent role: ${cleanString(topExperience.title, MAX_FIELD_LENGTH) || "a professional role"}${
          topExperience.company ? ` at ${cleanString(topExperience.company, MAX_FIELD_LENGTH)}` : ""
        }`,
    ]
      .filter(Boolean)
      .join("\n");

    let response: unknown;
    try {
      response = await this.ai.run("@cf/openai/gpt-oss-120b", {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.5,
        max_tokens: 900,
      });
    } catch (err) {
      throw new CoverLetterGenerateError(
        `Couldn't reach the AI (${err instanceof Error ? err.message : "unknown error"}). Try again, or write this in by hand.`
      );
    }

    const parsed = extractParsedJson(response);
    const paragraphs = sanitizeParagraphs(parsed);
    const body = paragraphs.length > 0 ? paragraphs.join("\n\n") : `I am writing to express my interest in ${roleLine} opportunities.`;

    return ["Dear Hiring Manager,", "", body, "", "Sincerely,", name].join("\n");
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

/**
 * Same "prefer AI, never let it fail the save" wrapper as
 * ContentGeneratorWithFallback (see ContentGenerator.ts's doc comment for
 * the full reasoning) — a cover letter is only ever generated on an
 * already-in-progress resume create/update, so a Workers AI outage here
 * would otherwise fail that save too. Falls back to
 * RuleBasedCoverLetterGenerator on any CoverLetterGenerateError; anything
 * else is rethrown rather than masked.
 */
export class CoverLetterGeneratorWithFallback implements ICoverLetterGenerator {
  constructor(
    private readonly primary: ICoverLetterGenerator,
    private readonly fallback: ICoverLetterGenerator
  ) {}

  async generate(input: CoverLetterInput): Promise<string> {
    try {
      return await this.primary.generate(input);
    } catch (err) {
      if (!(err instanceof CoverLetterGenerateError)) throw err;
      console.error("CoverLetterGenerator: AI generation failed, falling back to the rule-based generator:", err);
      return this.fallback.generate(input);
    }
  }
}

// --- Below: the original deterministic implementation, kept for reference
// and as a fallback if Workers AI is ever unavailable — no longer wired up
// by default (see createServices.ts). ---

/**
 * Rule-based cover letter generator — the same "reads like AI, is actually
 * deterministic template logic" approach ContentGenerator.ts used to use.
 * `generate()` is `async` only to satisfy ICoverLetterGenerator's shape
 * (shared with AiCoverLetterGenerator above); the body itself is still
 * synchronous, no I/O.
 */
export class RuleBasedCoverLetterGenerator implements ICoverLetterGenerator {
  async generate({ fullName, title, professionLabel, summary, topExperience }: CoverLetterInput): Promise<string> {
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
