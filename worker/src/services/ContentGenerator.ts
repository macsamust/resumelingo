import { getProfessionByKey } from "../config/professions";

export interface GeneratedContent {
  summary: string;
  bullets: string[];
}

/**
 * Contract for anything that can turn structured interview answers into
 * resume prose. Identical to the Node/Express version — no I/O, so no
 * Workers-specific changes needed. Swap in a real LLM-backed generator
 * (e.g. calling Workers AI or an external API) by implementing this same
 * interface.
 */
export interface IContentGenerator {
  generate(profession: string, answers: Record<string, string>): GeneratedContent;
}

export class RuleBasedContentGenerator implements IContentGenerator {
  generate(profession: string, answers: Record<string, string>): GeneratedContent {
    const definition = getProfessionByKey(profession);
    const label = definition?.label ?? profession;

    const summary = this.buildSummary(label, answers);
    const bullets = this.buildBullets(answers);

    return { summary, bullets };
  }

  private buildSummary(professionLabel: string, answers: Record<string, string>): string {
    const years = answers.yearsExperience ? `${answers.yearsExperience}+ years of experience` : "experienced professional";
    const topSkill = this.firstListValue(answers);
    const skillClause = topSkill ? ` specializing in ${topSkill}` : "";
    return `Results-driven ${professionLabel} with ${years}${skillClause}, known for translating requirements into measurable outcomes and consistently exceeding expectations.`;
  }

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
