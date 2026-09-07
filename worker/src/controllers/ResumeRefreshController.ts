import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { getProfessionByKey } from "../config/professions";
import { currentJobFor } from "../services/ResumeRefreshNudgeService";
import { AchievementEntry } from "../types";

const MAX_KEYWORDS_LENGTH = 1000;
const MAX_CAR_FIELD_LENGTH = 500;

/** Thrown for any bad/expired/wrong-purpose token on the no-login nudge landing page — mapped the same way as InvalidUnsubscribeTokenError. */
export class InvalidNudgeTokenError extends Error {}

/**
 * Backs the AI Resume Refresh nudge's no-login landing page (ResumeRefreshPage.tsx
 * on the client) — every route here is public, gated only by the signed
 * token from the nudge email, never a logged-in session (see
 * ResumeRefreshNudgeTokenPayload's doc comment for why a bare click is
 * enough: the token itself is what proves this is the right account/resume).
 *
 * Deliberately split into a cheap preview step and a separate commit step,
 * mirroring the "never auto-commit" product decision: previewBullet* calls
 * only ever return draft text for the client to show and let the person
 * edit; nothing is written to the resume until they explicitly click
 * through to commit.
 */
export class ResumeRefreshController {
  /** Verifies the token and loads everything the landing page needs to render its first screen — the "Are you still working at {company} as {title}?" question, or the generic fallback if there's no work experience to ask about. */
  private async loadContext(c: Context<AppEnv>, token: string) {
    const { resumeRefreshNudgeTokenService, resumeRepository } = c.get("services");
    let payload;
    try {
      payload = await resumeRefreshNudgeTokenService.verify(token);
    } catch {
      throw new InvalidNudgeTokenError("This link is invalid or has expired.");
    }
    if (payload.purpose !== "resume-refresh-nudge" || !payload.userId || !payload.resumeId) {
      throw new InvalidNudgeTokenError("This link is invalid or has expired.");
    }
    const record = await resumeRepository.findById(payload.resumeId);
    if (!record || record.userId !== payload.userId) {
      throw new InvalidNudgeTokenError("This link is invalid or has expired.");
    }
    return { payload, record };
  }

  /**
   * A keyword counts as "already used" if it shows up (case-insensitive,
   * whole-word) in any bullet or achievement field already on the resume —
   * catches both a bullet added through this same nudge flow earlier and
   * one the subscriber already had from Edit Resume, without needing to
   * track "which keyword produced which bullet" as its own piece of state.
   * Exported for testability, same reasoning as currentJobFor.
   */
  private usedKeywords(record: { generatedBullets: string; achievements: string }, keywords: string[]): string[] {
    const bullets: string[] = JSON.parse(record.generatedBullets || "[]");
    const achievements: AchievementEntry[] = JSON.parse(record.achievements || "[]");
    const haystack = [
      ...bullets,
      ...achievements.flatMap((a) => [a.challenge, a.action, a.result]),
    ]
      .join(" \n ")
      .toLowerCase();
    return keywords.filter((k) => {
      const escaped = k.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!escaped) return false;
      return new RegExp(`\\b${escaped}\\b`).test(haystack);
    });
  }

  /** GET /api/resume-refresh/preview?token=... — read-only, safe to prefetch (same reasoning as verify-email: previewing a stale/valid link early is harmless, unlike the unsubscribe/commit actions). */
  preview = async (c: Context<AppEnv>) => {
    const token = c.req.query("token") ?? "";
    const { skillSuggestionRepository } = c.get("services");
    const { record } = await this.loadContext(c, token);
    const job = currentJobFor(record.experience);
    const professionLabel = getProfessionByKey(record.profession)?.label ?? record.profession;
    const suggestions = await skillSuggestionRepository.findByProfession(record.profession);
    // A wider pick than the email's 5 — this is an interactive picker, not
    // a glance-and-click email, so showing more curated options here is
    // fine. Still the same honest, admin-curated catalog — see
    // SkillSuggestionRepository's doc comment and TODO.md's "I do not
    // want to oversell features" decision.
    const keywords = suggestions.slice(0, 12).map((s) => s.label);
    return c.json({
      resumeTitle: record.title,
      professionLabel,
      company: job?.company ?? null,
      jobTitle: job?.title ?? null,
      keywords,
      // Flagged rather than filtered out entirely, so the picker can grey
      // them out with an explanation instead of a keyword just silently
      // disappearing between one email and the next — see
      // ResumeRefreshPage.tsx. Covers a subscriber reopening an old nudge
      // email (or clicking the same one twice) after already adding a
      // bullet from a given keyword, which would otherwise draft a
      // near-duplicate bullet every time.
      usedKeywords: this.usedKeywords(record, keywords),
    });
  };

  /**
   * POST /api/resume-refresh/preview-keyword-bullet — fast path: turns the
   * chosen keyword(s) into draft bullets via the same "Generate from
   * keywords" pipeline used elsewhere in the app (AchievementGeneratorService),
   * which already turns a comma-separated list of phrases into one bullet
   * per phrase — accepting an array here (rather than one keyword at a
   * time) is what lets the picker support selecting several keywords at
   * once. Preview only — nothing saved yet.
   */
  previewKeywordBullet = async (c: Context<AppEnv>) => {
    const body = await c.req.json().catch(() => ({}));
    const { token, keywords } = (body ?? {}) as { token?: unknown; keywords?: unknown };
    let keywordList = Array.isArray(keywords) ? keywords.filter((k): k is string => typeof k === "string" && !!k.trim()) : [];
    if (typeof token !== "string" || keywordList.length === 0) {
      return c.json({ error: "Missing token or keywords." }, 400);
    }
    const { achievementGeneratorService } = c.get("services");
    const { record } = await this.loadContext(c, token);

    // Re-checked against the resume's *current* state, not just whatever
    // the picker loaded a moment ago — closes the gap where a subscriber
    // reopens an older nudge email (or the same one twice) after already
    // adding a bullet for a keyword, which would otherwise silently draft
    // a near-duplicate every time. See usedKeywords' doc comment.
    const alreadyUsed = this.usedKeywords(record, keywordList);
    keywordList = keywordList.filter((k) => !alreadyUsed.includes(k));
    if (keywordList.length === 0) {
      return c.json(
        { error: "Looks like a bullet for that was already added to this resume — pick a different keyword, or describe it yourself instead." },
        409
      );
    }

    const joined = keywordList.join(", ");
    if (joined.length > MAX_KEYWORDS_LENGTH) {
      return c.json({ error: "That's too many keywords at once. Try fewer." }, 400);
    }
    const job = currentJobFor(record.experience);
    const professionLabel = getProfessionByKey(record.profession)?.label ?? record.profession;
    const achievements = await achievementGeneratorService.generate({
      professionLabel,
      jobTitle: job ? `${job.title} at ${job.company}` : undefined,
      keywords: joined,
    });
    if (achievements.length === 0) {
      return c.json({ error: "Couldn't draft a bullet from that. Try different keywords, or write it in by hand from Edit Resume." }, 422);
    }
    return c.json({ achievements });
  };

  /** POST /api/resume-refresh/preview-car-bullet — deep path: stitches a Challenge/Action/Result entry into one bullet via the same IContentGenerator pipeline every resume save already uses (see ResumeService.update). Preview only — nothing saved yet. */
  previewCarBullet = async (c: Context<AppEnv>) => {
    const body = await c.req.json().catch(() => ({}));
    const { token, challenge, action, result } = (body ?? {}) as {
      token?: unknown;
      challenge?: unknown;
      action?: unknown;
      result?: unknown;
    };
    if (typeof token !== "string") {
      return c.json({ error: "Missing token." }, 400);
    }
    const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_CAR_FIELD_LENGTH) : "");
    const entry: AchievementEntry = { challenge: clean(challenge), action: clean(action), result: clean(result), experienceId: null };
    if (!entry.challenge && !entry.action && !entry.result) {
      return c.json({ error: "Fill in at least one of Challenge, Action, or Result." }, 400);
    }
    const { contentGenerator } = c.get("services");
    const { record } = await this.loadContext(c, token);
    const professionLabel = getProfessionByKey(record.profession)?.label ?? record.profession;
    const generated = await contentGenerator.generate(record.profession, {}, [entry], record.fullName, record.title);
    const bulletText = generated.bullets[0] ?? "";
    if (!bulletText) {
      return c.json({ error: "Couldn't turn that into a bullet. Try adding a bit more detail, or write it in by hand from Edit Resume." }, 422);
    }
    return c.json({ achievement: entry, bulletText, professionLabel });
  };

  /**
   * POST /api/resume-refresh/commit — the only route here that writes
   * anything. Takes every achievement the person reviewed (and possibly
   * hand-edited) plus each one's final bullet text — one item for the CAR
   * path, one or more for the keyword path now that multiple keywords can
   * be selected at once — and appends all of them to the resume in a
   * single ResumeService.update call (one version snapshot for the whole
   * batch, not one per bullet). Passes generatedBullets explicitly
   * alongside achievements so the new bullets still show up even if this
   * resume's summary/bullets were previously hand-edited (summaryManuallyEdited),
   * in which case ResumeService.update's normal auto-regeneration is
   * skipped and would otherwise silently drop them. See that method's doc
   * comment for the branch this relies on.
   */
  commit = async (c: Context<AppEnv>) => {
    const body = await c.req.json().catch(() => ({}));
    const { token, items } = (body ?? {}) as { token?: unknown; items?: unknown };
    const itemList = Array.isArray(items) ? items : [];
    if (typeof token !== "string" || itemList.length === 0) {
      return c.json({ error: "Missing token or bullets to add." }, 400);
    }

    const { payload, record } = await this.loadContext(c, token);
    // Link every new achievement to the job the email asked about, if there
    // was one — same nesting behavior as adding one by hand on Edit Resume
    // (see AchievementEntry.experienceId's doc comment).
    const job = currentJobFor(record.experience);
    const existingAchievements: AchievementEntry[] = JSON.parse(record.achievements || "[]");
    const existingBullets: string[] = JSON.parse(record.generatedBullets || "[]");
    // Exact-text, case/whitespace-insensitive — the last line of defense
    // against a duplicate bullet, on top of the picker disabling
    // already-used keywords and previewKeywordBullet re-checking them.
    // Catches the CAR path too (which has no keyword to check against) and
    // covers a race where two commits for the same resume land back to
    // back before either one's result reaches the picker.
    //
    // Also strips trailing sentence punctuation and folds curly
    // quotes/apostrophes to straight ones (found via QA's DUP-03: the CAR
    // path runs Challenge/Action/Result through the AI content generator,
    // which can reproduce an existing bullet's exact wording but with a
    // different trailing period or a curly vs. straight apostrophe —
    // "exact" to a person reading it, but not byte-identical, so the old
    // trim/lowercase/whitespace-collapse alone let it through).
    const normalize = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[.!?]+$/, "")
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"');
    const existingNormalized = new Set(existingBullets.map(normalize));

    const newAchievements: AchievementEntry[] = [];
    const newBullets: string[] = [];
    let skippedDuplicates = 0;
    for (const raw of itemList) {
      const item = (raw ?? {}) as Record<string, unknown>;
      const bulletText = typeof item.bulletText === "string" ? item.bulletText.trim().slice(0, 500) : "";
      if (!bulletText) continue;
      if (existingNormalized.has(normalize(bulletText))) {
        skippedDuplicates++;
        continue;
      }
      const a = (item.achievement ?? {}) as Record<string, unknown>;
      newAchievements.push({
        challenge: typeof a.challenge === "string" ? a.challenge.slice(0, MAX_CAR_FIELD_LENGTH) : "",
        action: typeof a.action === "string" ? a.action.slice(0, MAX_CAR_FIELD_LENGTH) : "",
        result: typeof a.result === "string" ? a.result.slice(0, MAX_CAR_FIELD_LENGTH) : "",
        experienceId: job?.id ?? null,
      });
      newBullets.push(bulletText);
      // Also checked within this same batch — two selected keywords that
      // happen to draft the same bullet text shouldn't both be added.
      existingNormalized.add(normalize(bulletText));
    }
    if (newAchievements.length === 0) {
      return c.json({ error: "That's already on this resume — nothing new to add." }, 409);
    }

    const { resumeService } = c.get("services");
    await resumeService.update(payload.userId, payload.resumeId, {
      achievements: [...existingAchievements, ...newAchievements],
      generatedBullets: [...existingBullets, ...newBullets],
    });
    return c.json({ success: true, added: newAchievements.length, skippedDuplicates });
  };
}
