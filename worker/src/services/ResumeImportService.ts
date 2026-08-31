import { AchievementEntry, AwardEntry, EducationEntry, SkillOrTool, WorkExperienceEntry } from "../types";

/**
 * "Import Resume" — turns raw text (extracted client-side from an uploaded
 * PDF/DOCX, see client's utils/resumeImport.ts) into structured fields the
 * Resume Builder can prefill, via Workers AI. Unlike every other generator
 * in this codebase (ContentGenerator, CareerCoachGenerator, etc. — all
 * deterministic, no I/O, "reads like AI but isn't"), this one makes a real
 * model call, since the whole point is handling resumes with no consistent
 * structure a rule-based parser could rely on.
 *
 * Model output is never trusted as-is: parseModelJson tolerates the model
 * wrapping its answer in prose or a code fence, and sanitize() below coerces
 * every field to the right type/shape and caps array lengths, so a
 * malformed or hallucinated response degrades to missing fields rather than
 * a crash or an unbounded response.
 */
const MAX_INPUT_CHARS = 20000;
const MAX_ARRAY_ENTRIES = 20;
const MAX_SHORT_FIELD = 200;
const MAX_DESCRIPTION_FIELD = 600;
const MONTH_RE = /^\d{4}-\d{2}$/;

export interface ImportedResumeData {
  fullName: string;
  contactEmail: string;
  contactPhone: string;
  contactLinkedIn: string;
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  skillsAndTools: SkillOrTool[];
  awards: AwardEntry[];
  /**
   * Extracted as achievements, but mostly action-only — most source resumes
   * don't naturally decompose into Challenge/Action/Result, so the prompt
   * only asks the model to fill in challenge/result when the source text
   * genuinely separates a cause from an effect. An action-only achievement
   * renders as a clean plain bullet (see ContentGenerator.toStarBullet),
   * which is what makes it safe to default to. Each entry may carry an
   * `experienceId` referencing one of the `experience` entries above, so
   * imported achievements can nest under the right job the same way
   * manually-entered ones can.
   */
  achievements: AchievementEntry[];
  /** Free-text notes surfaced to the user about fields the model was unsure of (e.g. an inferred date) — see AiWarning in the client's import review screen. Never blocks import, just prompts a closer look. */
  notes: string[];
}

const EMPTY_RESULT: ImportedResumeData = {
  fullName: "",
  contactEmail: "",
  contactPhone: "",
  contactLinkedIn: "",
  experience: [],
  education: [],
  skillsAndTools: [],
  awards: [],
  achievements: [],
  notes: [],
};

export class ResumeImportError extends Error {}

const SYSTEM_PROMPT = `You extract structured resume data from raw, possibly messy, unstructured resume text. The text may have no clear section headers, inconsistent or partial dates, and job history described in prose rather than bullet points.

Respond with ONLY a single JSON object (no prose, no markdown code fence) matching exactly this shape:
{
  "fullName": string,
  "contactEmail": string,
  "contactPhone": string,
  "contactLinkedIn": string,
  "experience": [{ "company": string, "title": string, "city": string, "state": string, "startDate": "YYYY-MM" or "", "endDate": "YYYY-MM" or "" or null, "current": boolean }],
  "education": [{ "school": string, "degree": string, "fieldOfStudy": string, "startDate": "YYYY-MM" or "", "endDate": "YYYY-MM" or "" or null, "current": boolean }],
  "skillsAndTools": [{ "label": string, "category": "skill" or "tool" }],
  "awards": [{ "title": string, "issuer": string, "date": "YYYY-MM" or "", "description": string }],
  "achievements": [{ "action": string, "challenge": string, "result": string, "company": string }],
  "notes": [string]
}

Rules:
- Include every job/role mentioned, even ones described only in a paragraph with no clear header, and even short contract/part-time gigs.
- "current" is true only for a role/program explicitly ongoing (e.g. "present"); endDate must be null in that case.
- If a date can't be determined precisely, leave it as "" rather than guessing, but add a short note to "notes" explaining what's missing (e.g. "Education start date wasn't stated for University of Wisconsin–Madison").
- Categorize concrete programming languages/methodologies as "skill" and named platforms/software/tools as "tool". This is a judgment call, do your best.
- Never invent a company, school, date, or accomplishment that isn't supported by the text.
- If something in the source is ambiguous or a judgment call (e.g. whether a short freelance gig counts as a real job), include it but add a one-sentence note explaining the call you made.
- "achievements" is a list of resume bullet points pulled from anywhere in the text (bullet points under a job, or accomplishments described in prose). If the source already has one or more dedicated bulleted sections of accomplishments (e.g. "Areas of Strength," "Core Competencies," "Key Achievements," "Highlights," or similar, whether or not they're grouped under sub-headers), include EVERY bullet from those sections — the person already curated each one, so do not summarize, merge, or drop any to fit a small count. If accomplishments are only described loosely in prose with no dedicated bullet list, use judgment and produce the 3-8 strongest, most concrete bullets instead. Across the whole resume, do not exceed 20 achievements total (if there are genuinely more than 20 source bullets, keep the 20 strongest). For each one:
  - "action" is REQUIRED: a single ordinary resume bullet sentence the way it would actually appear on a resume (e.g. "Led the rebuild of the shipment-tracking service, cutting p95 API latency from 1200ms to 180ms"). Lightly tighten wording, but don't invent numbers/metrics that aren't in the source.
  - "challenge" and "result" are OPTIONAL and should almost always be left as "". Only fill them in if the source text itself clearly and separately describes a problem/situation ("challenge") and a distinct outcome ("result") as separate ideas. Do NOT force every bullet into this shape, and do NOT split a single natural sentence into pieces just to fill the fields. When in doubt, leave both blank and put everything into "action".
  - "company" should be the exact company name (matching one of the "experience" entries' "company" field) this achievement belongs to, if it's clearly tied to one job. Leave it "" if it's not clearly tied to a specific job (e.g. a general skill or cross-role accomplishment).
  - Do not duplicate something already fully captured by an "awards" entry.`;

function truthy(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanString(value: unknown, maxLen: number): string {
  if (!truthy(value)) return "";
  return value.trim().slice(0, maxLen);
}

function cleanMonth(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return MONTH_RE.test(trimmed) ? trimmed : "";
}

function cleanArray<T>(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max);
}

function sanitizeExperience(raw: unknown): WorkExperienceEntry[] {
  return cleanArray(raw, MAX_ARRAY_ENTRIES).map((entry) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const current = e.current === true;
    return {
      id: crypto.randomUUID(),
      company: cleanString(e.company, MAX_SHORT_FIELD),
      title: cleanString(e.title, MAX_SHORT_FIELD),
      city: cleanString(e.city, MAX_SHORT_FIELD),
      state: cleanString(e.state, MAX_SHORT_FIELD),
      startDate: cleanMonth(e.startDate),
      endDate: current ? null : cleanMonth(e.endDate) || null,
      current,
    };
  });
}

const MAX_ACHIEVEMENT_FIELD_LENGTH = 300;

/**
 * Achievements extracted mostly action-only (see SYSTEM_PROMPT) — an
 * action-only achievement renders as a clean plain bullet via
 * ContentGenerator.toStarBullet, so this is what makes it safe to default
 * to rather than forcing every source resume into Challenge/Action/Result.
 * "company" from the model is matched (case-insensitive, exact) against the
 * already-sanitized experience list to set `experienceId`, so imported
 * achievements nest under the right job the same way manually-entered ones
 * do via the "Combine Work Experience with Achievements" toggle.
 */
function sanitizeAchievements(raw: unknown, experience: WorkExperienceEntry[]): AchievementEntry[] {
  const byCompany = new Map(experience.filter((e) => e.company).map((e) => [e.company.trim().toLowerCase(), e.id]));
  const mapped: (AchievementEntry | null)[] = cleanArray(raw, MAX_ARRAY_ENTRIES).map((entry) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const action = cleanString(e.action, MAX_ACHIEVEMENT_FIELD_LENGTH);
    if (!action) return null;
    const companyKey = truthy(e.company) ? e.company.trim().toLowerCase() : "";
    const experienceId = companyKey ? byCompany.get(companyKey) ?? null : null;
    return {
      action,
      challenge: cleanString(e.challenge, MAX_ACHIEVEMENT_FIELD_LENGTH),
      result: cleanString(e.result, MAX_ACHIEVEMENT_FIELD_LENGTH),
      experienceId: experienceId ?? null,
    };
  });
  return mapped.filter((e): e is AchievementEntry => e !== null);
}

function sanitizeEducation(raw: unknown): EducationEntry[] {
  return cleanArray(raw, MAX_ARRAY_ENTRIES).map((entry) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const current = e.current === true;
    return {
      school: cleanString(e.school, MAX_SHORT_FIELD),
      degree: cleanString(e.degree, MAX_SHORT_FIELD),
      fieldOfStudy: cleanString(e.fieldOfStudy, MAX_SHORT_FIELD),
      startDate: cleanMonth(e.startDate),
      endDate: current ? null : cleanMonth(e.endDate) || null,
      current,
    };
  });
}

function sanitizeSkills(raw: unknown): SkillOrTool[] {
  return cleanArray(raw, MAX_ARRAY_ENTRIES * 2)
    .map((entry) => {
      const e = (entry ?? {}) as Record<string, unknown>;
      const label = cleanString(e.label, 60);
      const category = e.category === "tool" ? "tool" : "skill";
      return label ? { label, category: category as "skill" | "tool" } : null;
    })
    .filter((e): e is SkillOrTool => e !== null);
}

function sanitizeAwards(raw: unknown): AwardEntry[] {
  const mapped: (AwardEntry | null)[] = cleanArray(raw, MAX_ARRAY_ENTRIES).map((entry) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const title = cleanString(e.title, MAX_SHORT_FIELD);
    if (!title) return null;
    const award: AwardEntry = {
      title,
      issuer: cleanString(e.issuer, MAX_SHORT_FIELD),
      date: cleanMonth(e.date),
      description: cleanString(e.description, MAX_DESCRIPTION_FIELD),
    };
    return award;
  });
  return mapped.filter((e): e is AwardEntry => e !== null);
}

function sanitize(raw: Record<string, unknown>): ImportedResumeData {
  const experience = sanitizeExperience(raw.experience);
  return {
    fullName: cleanString(raw.fullName, MAX_SHORT_FIELD),
    contactEmail: cleanString(raw.contactEmail, MAX_SHORT_FIELD),
    contactPhone: cleanString(raw.contactPhone, 40),
    contactLinkedIn: cleanString(raw.contactLinkedIn, MAX_SHORT_FIELD),
    experience,
    education: sanitizeEducation(raw.education),
    skillsAndTools: sanitizeSkills(raw.skillsAndTools),
    awards: sanitizeAwards(raw.awards),
    achievements: sanitizeAchievements(raw.achievements, experience),
    notes: cleanArray(raw.notes, 10)
      .filter((n): n is string => truthy(n))
      .map((n) => n.trim().slice(0, 300)),
  };
}

/** Tolerates the model wrapping its JSON in a code fence or a sentence of prose around it, since not every Workers AI model reliably returns bare JSON even when asked to. */
function parseModelJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new ResumeImportError("The AI didn't return a recognizable result. Try again, or fill in the resume manually.");
  }
  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    // TEMP debug logging — see matching note above. Remove once confirmed.
    console.error("ResumeImportService: JSON.parse failed on model output:", text);
    throw new ResumeImportError("The AI's result couldn't be read. Try again, or fill in the resume manually.");
  }
}

/**
 * Pulls the structured result out of a Workers AI chat response, tolerating
 * every shape actually observed in practice (confirmed against real
 * responses from @cf/meta/llama-3.3-70b-instruct-fp8-fast — the OpenAI-
 * compatible wrapper Workers AI puts these models behind isn't fully
 * consistent about it):
 *   1. response.response as an object — the model's JSON output, already
 *      parsed for us. Used as-is, no JSON.parse needed.
 *   2. response.response as a string — parsed via parseModelJson (handles
 *      a code fence or stray prose around the JSON).
 *   3. response.choices[0].message.content as a string (the OpenAI-style
 *      path) — same parseModelJson handling, used when .response is
 *      missing/empty but this path has it.
 */
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

  console.error("ResumeImportService: unrecognized Workers AI response shape:", JSON.stringify(response));
  throw new ResumeImportError("The AI didn't return a result. Try again, or fill in the resume manually.");
}

export class ResumeImportService {
  constructor(private readonly ai: Ai) {}

  async extract(rawText: string): Promise<ImportedResumeData> {
    const text = rawText.trim();
    if (!text) return EMPTY_RESULT;
    const truncated = text.slice(0, MAX_INPUT_CHARS);

    let response: unknown;
    try {
      response = await this.ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: truncated },
        ],
        temperature: 0.2,
        // Without this, Workers AI's default output cap (commonly a few
        // hundred tokens) truncates the JSON mid-object for anything but a
        // trivially short resume — which is exactly what a "result couldn't
        // be read" JSON.parse failure looks like. 6144 comfortably covers a
        // full multi-job resume's worth of structured output within this
        // model's context window, including up to 20 achievement bullets
        // (raised from 4096 once the achievements instruction above stopped
        // capping at 8 — a resume whose accomplishments are already a
        // dedicated bulleted list, e.g. "Areas of Strength," can now surface
        // every one of up to 20 bullets instead of being capped to 8, and
        // the JSON payload for that is meaningfully bigger).
        max_tokens: 6144,
      });
    } catch (err) {
      throw new ResumeImportError(
        `Couldn't reach the AI import service (${err instanceof Error ? err.message : "unknown error"}). Try again, or fill in the resume manually.`
      );
    }

    const parsed = extractParsedJson(response);
    return sanitize(parsed);
  }
}
