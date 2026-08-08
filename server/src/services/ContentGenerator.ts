import { getProfessionByKey } from "../config/professions";
import { AchievementEntry } from "../types";

export interface GeneratedContent {
  summary: string;
  bullets: string[];
}

/**
 * Contract for anything that can turn structured interview answers into
 * resume prose. RuleBasedContentGenerator (below) is the default,
 * dependency-free implementation. A future OpenAIContentGenerator or
 * AzureOpenAIContentGenerator could implement the same interface and be
 * swapped in via ResumeService's constructor without touching callers.
 */
export interface IContentGenerator {
  generate(
    profession: string,
    answers: Record<string, string>,
    achievements?: AchievementEntry[],
    fullName?: string,
    title?: string
  ): GeneratedContent;
}

export class RuleBasedContentGenerator implements IContentGenerator {
  generate(
    profession: string,
    answers: Record<string, string>,
    achievements: AchievementEntry[] = [],
    fullName?: string,
    title?: string
  ): GeneratedContent {
    const definition = getProfessionByKey(profession);
    const label = definition?.label ?? profession;

    // The "Other" profession's label ("Other") isn't a real job title, so
    // "Results-driven Other with..." reads oddly. Lead with the person's
    // name instead, and pull the actual role out of the Resume title
    // (e.g. "Freelance Photographer Resume" -> "Freelance Photographer")
    // so the statement still names what the person does.
    const summary =
      profession === "other" && fullName?.trim()
        ? this.buildOtherSummary(fullName.trim(), answers, title)
        : this.buildSummary(label, answers);
    // Challenge/Action/Result entries produce genuinely impact-focused
    // bullets (the STAR/CAR method) and take priority when present, since
    // they're the person's own account of what changed because of their
    // work — not just a restatement of a tool or certification they listed.
    // Falls back to the old per-answer bullets so resumes created before
    // this field existed (or left blank) still get something reasonable.
    const bullets = achievements.length > 0 ? this.buildStarBullets(achievements) : this.buildBullets(answers);

    return { summary, bullets };
  }

  private buildSummary(professionLabel: string, answers: Record<string, string>): string {
    const years = answers.yearsExperience ? `${answers.yearsExperience}+ years of experience` : "experienced professional";
    const topSkill = this.firstListValue(answers);
    const skillClause = topSkill ? ` specializing in ${topSkill}` : "";
    return `Results-driven ${professionLabel} with ${years}${skillClause}, known for translating requirements into measurable outcomes and consistently exceeding expectations.`;
  }

  private buildOtherSummary(fullName: string, answers: Record<string, string>, title?: string): string {
    const years = answers.yearsExperience ? `${answers.yearsExperience}+ years of experience` : "experienced professional";
    const topSkill = this.firstListValue(answers);
    const skillClause = topSkill ? ` specializing in ${topSkill}` : "";
    const role = this.roleFromTitle(title);
    const roleClause = role ? ` as a ${role}` : "";
    return `${fullName} is results-driven${roleClause} with ${years}${skillClause}, known for translating requirements into measurable outcomes and consistently exceeding expectations.`;
  }

  /**
   * Resume titles are typically "{Role} Resume" (see the New Resume page's
   * default title), so strip a trailing "resume" word to recover just the
   * role — e.g. "Freelance Photographer Resume" -> "Freelance Photographer".
   * Returns undefined for a blank or generic ("New Resume") title so the
   * summary falls back to not naming a role at all rather than saying
   * something meaningless like "as a new".
   */
  private roleFromTitle(title: string | undefined): string | undefined {
    if (!title) return undefined;
    const stripped = title.trim().replace(/\s*resume\s*$/i, "").trim();
    if (!stripped || stripped.toLowerCase() === "new") return undefined;
    return stripped;
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
   * created before this field existed, or left blank). Instead of Websume's
   * original AI-backed generator, this is intentionally simple template
   * logic restating the raw profession Q&A answers.
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
