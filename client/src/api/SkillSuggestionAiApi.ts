import { ApiClient } from "./ApiClient";

export interface SkillSuggestionAiInput {
  professionKey: string;
  /** The resume's own title — the whole point of this over the static per-profession catalog (see SkillsAndToolsEditor.tsx). */
  title?: string;
  /** Labels already offered by the curated catalog (or already picked), so the model tries to add new ones instead of repeating them. */
  existingSkills?: string[];
  existingTools?: string[];
  /** The resume's profession Q&A answers (raw key -> value, same shape as Resume.answers) — the worker resolves each key to its question's actual label before prompting the AI. Grounds suggestions in what this person actually said, not just the title. */
  answers?: Record<string, string>;
}

export interface SkillSuggestionAiResult {
  skills: string[];
  tools: string[];
}

/**
 * POST /api/skill-suggestions/ai — see worker's SkillSuggestionAiController/
 * SkillSuggestionAiService. Professional/Premium-gated, same tier as
 * Achievement Generate. Used by SkillsAndToolsEditor.tsx's "Suggest more
 * with AI" option, additive to the curated per-profession chip list.
 */
export class SkillSuggestionAiApi extends ApiClient {
  generate(input: SkillSuggestionAiInput) {
    return this.post<SkillSuggestionAiResult>("/skill-suggestions/ai", input);
  }
}
