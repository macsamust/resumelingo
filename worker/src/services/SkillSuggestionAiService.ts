/**
 * AI-generated "Skills & Tools" suggestions, tailored to one resume's actual
 * title (e.g. "Senior Backend Engineer" vs. just "Software Engineer") rather
 * than the generic, profession-wide curated list in skill_suggestions (see
 * SkillSuggestionRepository / AdminSkillSuggestionController). The curated
 * list stays the default — this is an additional "Suggest more with AI"
 * pass in SkillsAndToolsEditor.tsx, additive rather than a replacement, so a
 * Workers AI outage or a thin/unhelpful result never leaves the picker
 * empty.
 *
 * Same shape as the other Workers AI services in this codebase
 * (AchievementGeneratorService is the closest sibling: same request/response
 * JSON contract, same tolerant parsing, same "professionLabel + optional
 * context" input). Not wrapped in a rule-based fallback like ContentGenerator/
 * CoverLetterGenerator — there's no reasonable non-AI equivalent for
 * "suggestions tailored to this specific title," and the curated catalog
 * already serves as the fallback UX (see SkillsAndToolsEditor.tsx: the AI
 * button/panel is additive, so its failure just means no extra chips, not a
 * broken picker).
 */
const MAX_PROFESSION_CHARS = 200;
const MAX_TITLE_CHARS = 200;
const MAX_EXISTING_LABEL_CHARS = 60;
const MAX_EXISTING_LABELS = 40;
const MAX_RESULT_ENTRIES = 8;
const MAX_LABEL_LENGTH = 60;
const MAX_ANSWER_LINES = 20;
const MAX_ANSWER_LINE_CHARS = 300;

export interface SkillSuggestionAiRequest {
  professionLabel: string;
  /** The resume's own title, e.g. "Senior Backend Engineer Resume" — the whole point of this feature over the static per-profession catalog. */
  title?: string;
  /** Labels already offered by the curated catalog (or already picked), so the model tries to add new ones instead of repeating them. */
  existingSkills?: string[];
  existingTools?: string[];
  /**
   * Pre-formatted "Label: value" lines from the resume's own profession
   * Q&A (see SkillSuggestionAiController, which builds these the same way
   * AiContentGenerator.answerLines does — resolving each answer key to its
   * question label from config/professions.ts). Grounds suggestions in
   * what the person actually said (e.g. an "Electronic Medical Record
   * Systems: Epic" answer nudging the model toward Epic-adjacent tools)
   * rather than just the title and profession name.
   */
  answerLines?: string[];
}

export interface SkillSuggestionAiResult {
  skills: string[];
  tools: string[];
}

export class SkillSuggestionAiError extends Error {}

const SYSTEM_PROMPT = `You suggest resume "Skills" and "Tools" keywords tailored to a specific job title within a broader profession, for a click-to-add keyword picker.

Respond with ONLY a single JSON object (no prose, no markdown code fence) matching exactly this shape:
{ "skills": string[], "tools": string[] }

Rules:
- "Skills" are competencies, techniques, or methodologies (e.g. "Incident Response", "Stakeholder Negotiation") — not named software or products.
- "Tools" are named software, platforms, certifications, frameworks, systems, or equipment (e.g. "Terraform", "Salesforce", "PMP").
- Tailor every suggestion to the specific job title given, not just the general profession — a "Senior Backend Engineer" and a "Frontend Engineer" should get noticeably different tools even though both are "Software Engineer". If no title is given, or it's too generic to add signal (e.g. just the profession name again), suggest well-known keywords for the profession generally instead.
- When questionnaire answers are given, use them as your strongest signal — they're what this specific person actually said about their own background, more reliable than the title alone. Let specific named tools/systems/specialties already mentioned there suggest closely related ones (e.g. an EMR system they named suggests other EMR-adjacent tools, not the same one restated).
- Never repeat a keyword already listed under "Already suggested" in the user message.
- Suggest only real, well-known, industry-standard skills/tools someone in this role would plausibly use. Don't invent obscure or made-up ones.
- Each keyword is short (1-4 words), written like a resume skill chip (Title Case), not a sentence or explanation.
- Return at most 8 skills and 8 tools. Fewer is fine if you don't have 8 good, genuinely relevant ones — don't pad with generic filler just to hit the count.`;

function truthy(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanString(value: unknown, maxLen: number): string {
  if (!truthy(value)) return "";
  return value.trim().slice(0, maxLen);
}

/** Same tolerant-parsing approach as the other AI services in this codebase — not shared into a common util since each service's error type/messages differ and each is small enough to stay self-contained. */
function parseModelJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new SkillSuggestionAiError("The AI didn't return a recognizable result. Try again, or pick from the suggestions below.");
  }
  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    console.error("SkillSuggestionAiService: JSON.parse failed on model output:", text);
    throw new SkillSuggestionAiError("The AI's result couldn't be read. Try again, or pick from the suggestions below.");
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

  console.error("SkillSuggestionAiService: unrecognized Workers AI response shape:", JSON.stringify(response));
  throw new SkillSuggestionAiError("The AI didn't return a result. Try again, or pick from the suggestions below.");
}

/** Dedupes case-insensitively and caps the list, same spirit as the other services' sanitize() functions. */
function sanitizeList(raw: unknown, exclude: Set<string>): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set(exclude);
  const out: string[] = [];
  for (const entry of list) {
    const label = cleanString(entry, MAX_LABEL_LENGTH);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= MAX_RESULT_ENTRIES) break;
  }
  return out;
}

function sanitize(raw: Record<string, unknown>, existingSkills: string[], existingTools: string[]): SkillSuggestionAiResult {
  const skillExclude = new Set(existingSkills.map((s) => s.toLowerCase()));
  const toolExclude = new Set(existingTools.map((t) => t.toLowerCase()));
  return {
    skills: sanitizeList(raw.skills, skillExclude),
    tools: sanitizeList(raw.tools, toolExclude),
  };
}

export class SkillSuggestionAiService {
  constructor(private readonly ai: Ai) {}

  async generate(request: SkillSuggestionAiRequest): Promise<SkillSuggestionAiResult> {
    const professionLabel = cleanString(request.professionLabel, MAX_PROFESSION_CHARS) || "professional";
    const title = cleanString(request.title, MAX_TITLE_CHARS);
    const existingSkills = (request.existingSkills ?? [])
      .slice(0, MAX_EXISTING_LABELS)
      .map((s) => cleanString(s, MAX_EXISTING_LABEL_CHARS))
      .filter(truthy);
    const existingTools = (request.existingTools ?? [])
      .slice(0, MAX_EXISTING_LABELS)
      .map((t) => cleanString(t, MAX_EXISTING_LABEL_CHARS))
      .filter(truthy);
    const existingAll = [...existingSkills, ...existingTools];
    const answerLines = (request.answerLines ?? [])
      .slice(0, MAX_ANSWER_LINES)
      .map((line) => cleanString(line, MAX_ANSWER_LINE_CHARS))
      .filter(truthy);

    const userContent = [
      `Profession: ${professionLabel}`,
      title && title.toLowerCase() !== professionLabel.toLowerCase() && `Job title: ${title}`,
      answerLines.length > 0 && `Questionnaire answers:\n${answerLines.join("\n")}`,
      existingAll.length > 0 && `Already suggested (don't repeat these): ${existingAll.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n\n");

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
      throw new SkillSuggestionAiError(
        `Couldn't reach the AI (${err instanceof Error ? err.message : "unknown error"}). Try again, or pick from the suggestions below.`
      );
    }

    const parsed = extractParsedJson(response);
    return sanitize(parsed, existingSkills, existingTools);
  }
}
