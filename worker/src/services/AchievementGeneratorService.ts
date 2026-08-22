import { AchievementEntry } from "../types";

/**
 * "Generate from keywords" — the inline alternative inside the Highlights &
 * Key Achievements section for someone who doesn't know where to start.
 * Unlike ResumeImportService (which extracts from real resume text, so
 * everything it returns is grounded in something the user actually wrote),
 * this one *drafts* bullets from a handful of loose keywords/phrases —
 * there's no source text to stay faithful to, which is exactly why the
 * prompt below is strict about never inventing specific numbers, employers,
 * or timeframes the user didn't provide. These are meant to be starting
 * points the user reviews and edits (they land as normal, fully-editable
 * achievement rows — see client's AchievementGeneratorPanel.tsx), not
 * finished claims.
 */
const MAX_KEYWORDS_CHARS = 1000;
const MAX_JOB_TITLE_CHARS = 200;
const MAX_PROFESSION_CHARS = 200;
const MAX_ARRAY_ENTRIES = 8;
const MAX_ACTION_LENGTH = 300;

export interface AchievementGenerateRequest {
  professionLabel: string;
  /** Optional — e.g. "Senior Backend Engineer at Acme Corp". Helps the model pitch bullets at the right seniority/domain without it having to guess from the profession alone. */
  jobTitle?: string;
  /** Free text — comma or newline separated keywords/rough phrases, e.g. "led migration to Kubernetes, mentored 3 juniors, cut deploy time". */
  keywords: string;
}

export class AchievementGenerateError extends Error {}

const SYSTEM_PROMPT = `You help someone write resume bullet points when they don't know where to start. You're given their profession/role and a short list of keywords or rough phrases describing things they did — not a real resume, just fragments. Turn each keyword/phrase into one polished, action-oriented resume bullet.

Respond with ONLY a single JSON object (no prose, no markdown code fence) matching exactly this shape:
{ "achievements": [{ "action": string }] }

Rules:
- Generate one achievement bullet per distinct keyword/phrase given, in the same order, up to 8 total. If fewer than 8 keywords were given, return that many bullets, not 8.
- Each bullet should start with a strong action verb and read like a real resume bullet.
- Never invent a specific number, percentage, dollar amount, team size, or timeframe that isn't already in the user's own words. If they gave a number, use it as given. If they didn't, either write the bullet without any quantification, or insert a bracketed placeholder like [X%] or [X hours] for the user to fill in themselves — never state an invented figure as fact.
- Never invent a company name, job title, employer, or product name that wasn't given.
- Keep each bullet to one sentence.
- These are starting points the user will review and personalize, not finished claims — write them so they read naturally, but don't overstate or fabricate anything beyond what the keyword actually says.`;

function truthy(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanString(value: unknown, maxLen: number): string {
  if (!truthy(value)) return "";
  return value.trim().slice(0, maxLen);
}

/** Same tolerant-parsing approach as ResumeImportService.parseModelJson — not shared into a common util since the two services' error types/messages differ and each is small enough to stay self-contained. */
function parseModelJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new AchievementGenerateError("The AI didn't return a recognizable result. Try again, or write these in by hand.");
  }
  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    console.error("AchievementGeneratorService: JSON.parse failed on model output:", text);
    throw new AchievementGenerateError("The AI's result couldn't be read. Try again, or write these in by hand.");
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

  console.error("AchievementGeneratorService: unrecognized Workers AI response shape:", JSON.stringify(response));
  throw new AchievementGenerateError("The AI didn't return a result. Try again, or write these in by hand.");
}

/** Action-only — challenge/result are left blank, same "safe default" reasoning as ResumeImportService's imported achievements (see ContentGenerator.toStarBullet): an action-only entry renders as a clean plain bullet with no STAR-stitching language. Never linked to a job (experienceId stays null) — the user places these themselves via the existing "which job" dropdown if they want one nested. */
function sanitize(raw: Record<string, unknown>): AchievementEntry[] {
  const list = Array.isArray(raw.achievements) ? raw.achievements : [];
  const mapped: (AchievementEntry | null)[] = list.slice(0, MAX_ARRAY_ENTRIES).map((entry) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const action = cleanString(e.action, MAX_ACTION_LENGTH);
    if (!action) return null;
    return { action, challenge: "", result: "", experienceId: null };
  });
  return mapped.filter((e): e is AchievementEntry => e !== null);
}

export class AchievementGeneratorService {
  constructor(private readonly ai: Ai) {}

  async generate(request: AchievementGenerateRequest): Promise<AchievementEntry[]> {
    const keywords = request.keywords.trim().slice(0, MAX_KEYWORDS_CHARS);
    if (!keywords) return [];

    const professionLabel = cleanString(request.professionLabel, MAX_PROFESSION_CHARS) || "professional";
    const jobTitle = cleanString(request.jobTitle, MAX_JOB_TITLE_CHARS);
    const userContent = [`Profession: ${professionLabel}`, jobTitle && `Role: ${jobTitle}`, `Keywords/phrases:\n${keywords}`]
      .filter(Boolean)
      .join("\n");

    let response: unknown;
    try {
      response = await this.ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.4,
        max_tokens: 1024,
      });
    } catch (err) {
      throw new AchievementGenerateError(
        `Couldn't reach the AI (${err instanceof Error ? err.message : "unknown error"}). Try again, or write these in by hand.`
      );
    }

    const parsed = extractParsedJson(response);
    return sanitize(parsed);
  }
}
