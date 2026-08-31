import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SubscriptionTier } from "../types";
import { getProfessionByKey } from "../config/professions";

const MAX_TITLE_LENGTH = 200;
const MAX_LABELS = 40;
const MAX_LABEL_LENGTH = 60;

const MAX_ANSWER_VALUE_LENGTH = 300;

function toLabelArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").slice(0, MAX_LABELS);
}

/**
 * Turns the resume's profession Q&A answers into "Label: value" lines for
 * the AI prompt — same approach as AiContentGenerator's answerLines
 * (ContentGenerator.ts), resolving each raw answer key to its question's
 * actual label from config/professions.ts rather than the raw camelCase
 * key, and skipping blanks. Grounds skill/tool suggestions in what this
 * specific person said (tools they already named, years of experience,
 * etc.), not just the title and profession name.
 */
function buildAnswerLines(professionKey: string, answers: Record<string, string>): string[] {
  const definition = getProfessionByKey(professionKey);
  return Object.entries(answers)
    .filter(([, value]) => typeof value === "string" && value.trim())
    .map(([key, value]) => {
      const question = definition?.questions.find((q) => q.key === key);
      const label = question?.label ?? key;
      return `${label}: ${value.trim().slice(0, MAX_ANSWER_VALUE_LENGTH)}`;
    });
}

/**
 * Resume titles are typically "{Role} Resume" (see the New Resume page's
 * default title, and AiContentGenerator.roleFromTitle for the identical
 * stripping logic used there) — e.g. "Senior Backend Engineer Resume" ->
 * "Senior Backend Engineer", the actual signal this feature exists for.
 * Returns undefined for a blank or generic ("New Resume") title.
 */
function roleFromTitle(title: string | undefined): string | undefined {
  if (!title) return undefined;
  const stripped = title.trim().replace(/\s*resume\s*$/i, "").trim();
  if (!stripped || stripped.toLowerCase() === "new") return undefined;
  return stripped;
}

/**
 * POST /api/skill-suggestions/ai — see services/SkillSuggestionAiService.ts.
 * Professional/Premium-gated, same tier as Achievement Generate/Resume
 * Import (the closest existing AI-assist features). Skills & Tools itself
 * is already Premium-template-only in the UI, so in practice this is only
 * ever called by a Premium-tier account anyway — this check is defense in
 * depth against calling the endpoint directly.
 */
export class SkillSuggestionAiController {
  generate = async (c: Context<AppEnv>) => {
    const user = c.get("user")!;
    if (user.subscriptionTier !== SubscriptionTier.Professional && user.subscriptionTier !== SubscriptionTier.Premium) {
      return c.json({ error: "AI skill suggestions require the Professional or Premium plan. Upgrade to use this tool." }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const { professionKey, title, existingSkills, existingTools, answers } = (body ?? {}) as {
      professionKey?: unknown;
      title?: unknown;
      existingSkills?: unknown;
      existingTools?: unknown;
      answers?: unknown;
    };
    if (typeof professionKey !== "string" || !professionKey.trim()) {
      return c.json({ error: "Pick a profession first, nothing to generate suggestions for." }, 400);
    }
    if (typeof title === "string" && title.length > MAX_TITLE_LENGTH) {
      return c.json({ error: `That title's too long (limit is ${MAX_TITLE_LENGTH} characters).` }, 400);
    }

    const professionLabel = getProfessionByKey(professionKey)?.label ?? professionKey;
    const answersRecord: Record<string, string> =
      answers && typeof answers === "object" && !Array.isArray(answers)
        ? Object.fromEntries(
            Object.entries(answers as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string")
          )
        : {};

    const { skillSuggestionAiService } = c.get("services");
    const result = await skillSuggestionAiService.generate({
      professionLabel,
      title: roleFromTitle(typeof title === "string" ? title : undefined),
      existingSkills: toLabelArray(existingSkills).map((s) => s.slice(0, MAX_LABEL_LENGTH)),
      existingTools: toLabelArray(existingTools).map((t) => t.slice(0, MAX_LABEL_LENGTH)),
      answerLines: buildAnswerLines(professionKey, answersRecord),
    });
    return c.json(result);
  };
}
