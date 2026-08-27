import { getProfessionByKey } from "../config/professions";
import { RoleDescriptionRepository } from "../repositories/RoleDescriptionRepository";
import { AchievementEntry } from "../types";

export interface GeneratedContent {
  summary: string;
  bullets: string[];
}

/**
 * Contract for anything that can turn structured interview answers into
 * resume prose. AiContentGenerator (below) is the default, real Workers AI
 * implementation as of Aug 2026 — RuleBasedContentGenerator (further below)
 * is kept as the original deterministic fallback (no longer wired up by
 * default), same "keep the old implementation, no longer the default"
 * pattern as CareerCoachGenerator.ts.
 */
export interface IContentGenerator {
  generate(
    profession: string,
    answers: Record<string, string>,
    achievements?: AchievementEntry[],
    fullName?: string,
    title?: string
  ): Promise<GeneratedContent>;
}

export class ContentGenerateError extends Error {}

const MAX_SUMMARY_LENGTH = 1200;
const MAX_BULLETS_COUNT = 12;
const MAX_BULLET_LENGTH = 400;
const MAX_ANSWER_VALUE_LENGTH = 300;

const SYSTEM_PROMPT = `You write resume content — an About/Summary statement and a list of bullet points — from a person's profession, their answers to a short intake questionnaire, and (when given) specific Challenge/Action/Result achievement entries in their own words.

Respond with ONLY a single JSON object (no prose, no markdown code fence) matching exactly this shape:
{ "summary": string, "bullets": string[] }

Rules:
- The summary is a single short paragraph (2-4 sentences) written in third person, resume-voice (no "I"), describing the person's profession, experience level, and standout strengths — the kind of statement that sits at the top of a resume under the person's name.
- Never invent a specific number, percentage, dollar amount, team size, employer, certification, or timeframe that isn't already present in the given answers or achievements. If years of experience is given, use it. If it isn't, don't guess a number.
- Prefer building bullets from the given Achievement entries (challenge/action/result) when present — one bullet per achievement, action-led (start with a strong past-tense verb), weaving in the challenge and result when given. If no achievements are given, build bullets from the questionnaire answers instead, describing how the listed skills/tools/experience were applied.
- Each bullet is one sentence, action-led, and reads like a real resume bullet — not a restatement of the raw answer text.
- Return at most 10 bullets. Skip questionnaire fields that are blank or clearly not resume-relevant (e.g. a profile URL).
- Never mention that this was AI-generated, and never include meta-commentary — only the summary and bullets themselves.`;

function truthy(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanString(value: unknown, maxLen: number): string {
  if (!truthy(value)) return "";
  return value.trim().slice(0, maxLen);
}

/** Same tolerant-parsing approach as the other AI services in this codebase (ContentGenerator, CareerCoachGenerator, AchievementGeneratorService, ResumeImportService) — not shared into a common util since each service's error type/messages differ and each is small enough to stay self-contained. */
function parseModelJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new ContentGenerateError("The AI didn't return a recognizable result. Try again, or write this in by hand.");
  }
  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    console.error("ContentGenerator: JSON.parse failed on model output:", text);
    throw new ContentGenerateError("The AI's result couldn't be read. Try again, or write this in by hand.");
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

  console.error("ContentGenerator: unrecognized Workers AI response shape:", JSON.stringify(response));
  throw new ContentGenerateError("The AI didn't return a result. Try again, or write this in by hand.");
}

function sanitize(raw: Record<string, unknown>): GeneratedContent {
  const summary = cleanString(raw.summary, MAX_SUMMARY_LENGTH);
  const bulletsList = Array.isArray(raw.bullets) ? raw.bullets : [];
  const bullets = bulletsList
    .slice(0, MAX_BULLETS_COUNT)
    .map((b) => cleanString(b, MAX_BULLET_LENGTH))
    .filter((b): b is string => !!b);
  return { summary, bullets };
}

export class AiContentGenerator implements IContentGenerator {
  constructor(private readonly ai: Ai) {}

  async generate(
    profession: string,
    answers: Record<string, string>,
    achievements: AchievementEntry[] = [],
    fullName?: string,
    title?: string
  ): Promise<GeneratedContent> {
    const definition = getProfessionByKey(profession);
    const professionLabel = definition?.label ?? profession;

    // "Other" has no curated question set — fall back to whatever role can
    // be pulled from the resume title, same as the old rule-based
    // implementation's buildOtherSummary, since that's the only signal
    // available for a profession the model wasn't given a schema for.
    const roleHint =
      profession === "other" ? this.roleFromTitle(title) : undefined;

    const answerLines = Object.entries(answers)
      .filter(([, value]) => truthy(value))
      .map(([key, value]) => {
        const question = definition?.questions.find((q) => q.key === key);
        const label = question?.label ?? key;
        return `${label}: ${cleanString(value, MAX_ANSWER_VALUE_LENGTH)}`;
      });

    const achievementLines = achievements.slice(0, MAX_BULLETS_COUNT).map((a, i) => {
      const parts = [a.challenge && `Challenge: ${cleanString(a.challenge, MAX_ANSWER_VALUE_LENGTH)}`, a.action && `Action: ${cleanString(a.action, MAX_ANSWER_VALUE_LENGTH)}`, a.result && `Result: ${cleanString(a.result, MAX_ANSWER_VALUE_LENGTH)}`].filter(Boolean);
      return `${i + 1}. ${parts.join(" / ")}`;
    });

    const userContent = [
      `Profession: ${roleHint ?? professionLabel}`,
      fullName && `Name: ${cleanString(fullName, 200)}`,
      answerLines.length > 0 && `Questionnaire answers:\n${answerLines.join("\n")}`,
      achievementLines.length > 0 && `Achievement entries:\n${achievementLines.join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    let response: unknown;
    try {
      response = await this.ai.run("@cf/openai/gpt-oss-120b", {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent || `Profession: ${professionLabel}` },
        ],
        temperature: 0.5,
        max_tokens: 1200,
      });
    } catch (err) {
      throw new ContentGenerateError(
        `Couldn't reach the AI (${err instanceof Error ? err.message : "unknown error"}). Try again, or write this in by hand.`
      );
    }

    const parsed = extractParsedJson(response);
    return sanitize(parsed);
  }

  /**
   * Resume titles are typically "{Role} Resume" (see the New Resume page's
   * default title), so strip a trailing "resume" word to recover just the
   * role — e.g. "Freelance Photographer Resume" -> "Freelance Photographer".
   * Returns undefined for a blank or generic ("New Resume") title, same
   * behavior as the old rule-based implementation.
   */
  private roleFromTitle(title: string | undefined): string | undefined {
    if (!title) return undefined;
    const stripped = title.trim().replace(/\s*resume\s*$/i, "").trim();
    if (!stripped || stripped.toLowerCase() === "new") return undefined;
    return stripped;
  }
}

// --- Below: the original deterministic implementation, kept for reference
// and as a fallback if Workers AI is ever unavailable — no longer wired up
// by default (see createServices.ts). ---

export class RuleBasedContentGenerator implements IContentGenerator {
  constructor(private readonly roleDescriptions: RoleDescriptionRepository) {}

  async generate(
    profession: string,
    answers: Record<string, string>,
    achievements: AchievementEntry[] = [],
    fullName?: string,
    title?: string
  ): Promise<GeneratedContent> {
    const definition = getProfessionByKey(profession);
    const label = definition?.label ?? profession;

    // The "Other" profession's label ("Other") isn't a real job title, so
    // instead of the standard "Results-driven {label} with..." shape, build
    // a generic professional description of the role pulled from the
    // Resume title (e.g. "Comedian Resume" -> "Comedian").
    const summary =
      profession === "other" ? await this.buildOtherSummary(title) : await this.buildSummary(profession, label, answers);
    // Challenge/Action/Result entries produce genuinely impact-focused
    // bullets (the STAR/CAR method) and take priority when present, since
    // they're the person's own account of what changed because of their
    // work — not just a restatement of a tool or certification they listed.
    // Falls back to the old per-answer bullets so resumes created before
    // this field existed (or left blank) still get something reasonable.
    const bullets = achievements.length > 0 ? this.buildStarBullets(achievements) : this.buildBullets(answers);

    return { summary, bullets };
  }

  /**
   * Builds the About statement for every profession except "Other" (see
   * buildOtherSummary below for that one). Prefers the profession's own
   * curated row (see RoleDescriptionRepository.findByProfessionKey) for the
   * descriptor/traits/outcome/keyTraits clauses, so each profession reads
   * in its own voice instead of one shared generic sentence. Falls back to
   * the old plain sentence when a profession has no curated row yet.
   */
  private async buildSummary(profession: string, professionLabel: string, answers: Record<string, string>): Promise<string> {
    const years = answers.yearsExperience ? `${answers.yearsExperience}+ years of experience` : "experienced professional";
    const topSkill = this.firstListValue(answers);
    const skillClause = topSkill ? ` specializing in ${topSkill}` : "";

    const description = await this.roleDescriptions.findByProfessionKey(profession);
    if (!description) {
      return `Results-driven ${professionLabel} with ${years}${skillClause}, known for translating requirements into measurable outcomes and consistently exceeding expectations.`;
    }

    const { descriptor, traits, outcome, keyTraits } = description;
    return `Results-driven ${professionLabel} with ${years}${skillClause}, ${descriptor} who combines ${traits[0]}, ${traits[1]}, and ${traits[2]} to ${outcome}. Known for ${keyTraits[0]}, ${keyTraits[1]}, and ${keyTraits[2]}.`;
  }

  /**
   * Builds a generic, professionally-worded description of the role itself
   * (not the person), as a comma appositive — e.g. "A successful
   * entertainer, versatile public performer who combines sharp writing,
   * deep audience connection, and precise timing to evoke laughter. Key
   * traits include originality, an authentic stage persona, and strong
   * resilience under pressure." Falls back to a generic "professional"
   * description when no usable role can be pulled from the title.
   */
  private async buildOtherSummary(title: string | undefined): Promise<string> {
    const role = this.roleFromTitle(title) ?? "professional";
    const { category, descriptor, traits, outcome, keyTraits } = await this.roleDescriptions.findByRole(role);
    return `A successful ${category}, ${descriptor} who combines ${traits[0]}, ${traits[1]}, and ${traits[2]} to ${outcome}. Key traits include ${keyTraits[0]}, ${keyTraits[1]}, and ${keyTraits[2]}.`;
  }

  /**
   * Resume titles are typically "{Role} Resume" (see the New Resume page's
   * default title), so strip a trailing "resume" word to recover just the
   * role — e.g. "Freelance Photographer Resume" -> "Freelance Photographer".
   * Returns undefined for a blank or generic ("New Resume") title.
   */
  private roleFromTitle(title: string | undefined): string | undefined {
    if (!title) return undefined;
    const stripped = title.trim().replace(/\s*resume\s*$/i, "").trim();
    if (!stripped || stripped.toLowerCase() === "new") return undefined;
    return stripped.toLowerCase();
  }

  /**
   * Turns each Challenge/Action/Result entry into one bullet, action-led
   * (standard resume convention: lead with a strong verb) followed by the
   * challenge it addressed and the measurable result — e.g. "Redesigned the
   * onboarding flow in response to a 40% signup drop-off, resulting in a 25%
   * increase in completed signups." Entries missing a piece still produce a
   * bullet from whatever was filled in, rather than being skipped outright.
   */
  private buildStarBullets(achievements: AchievementEntry[]): string[] {
    return achievements
      .map((a) => this.toStarBullet(a))
      .filter((bullet): bullet is string => !!bullet);
  }

  private toStarBullet(achievement: AchievementEntry): string | undefined {
    const action = this.asClause(achievement.action);
    const challenge = this.asClause(achievement.challenge);
    const result = this.asClause(achievement.result);

    const segments: string[] = [];
    if (action) segments.push(this.capitalize(action));
    if (challenge) segments.push(`in response to ${challenge}`);
    if (result) segments.push(`resulting in ${result}`);

    if (segments.length === 0) return undefined;
    return `${segments.join(", ")}.`;
  }

  /** Lowercases the leading word and strips trailing punctuation, so free text can be spliced mid-sentence. */
  private asClause(text: string | undefined): string {
    if (!text) return "";
    const trimmed = text.trim().replace(/[.!?]+$/, "");
    if (!trimmed) return "";
    return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  }

  private capitalize(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Fallback used only when no achievements are provided (e.g. a resume
   * created before this field existed, or left blank). Intentionally
   * simple template logic restating the raw profession Q&A answers.
   */
  private buildBullets(answers: Record<string, string>): string[] {
    const bullets: string[] = [];
    for (const [key, value] of Object.entries(answers)) {
      if (!value || !value.trim()) continue;
      bullets.push(this.turnAnswerIntoAchievement(key, value));
    }
    if (bullets.length === 0) {
      bullets.push("Delivered measurable results by combining technical expertise with clear communication.");
    }
    return bullets;
  }

  private turnAnswerIntoAchievement(key: string, value: string): string {
    const readableKey = key.replace(/([A-Z])/g, " $1").toLowerCase().trim();
    const items = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const joined = items.length > 1 ? items.join(", ") : value;

    return `Leveraged ${joined} to strengthen ${readableKey}, contributing directly to team performance and delivery outcomes.`;
  }

  private firstListValue(answers: Record<string, string>): string | undefined {
    const entry = Object.values(answers).find((v) => v && v.includes(","));
    if (entry) return entry.split(",")[0].trim();
    return Object.values(answers).find((v) => !!v);
  }
}
