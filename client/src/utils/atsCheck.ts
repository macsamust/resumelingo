import { LayoutFamily } from "../config/templateStyles";
import { AchievementEntry, AwardEntry, EducationEntry, WorkExperienceEntry } from "../types";

/**
 * Layout families that read top-to-bottom, left-to-right in a single
 * column — the layout ATS parsers handle most reliably. Sidebar/banner/
 * grid families can scramble or drop text when a parser reads across
 * columns instead of down them. See client/src/config/templateStyles.ts
 * for the full family list.
 */
const ATS_SAFE_FAMILIES = new Set<LayoutFamily>(["executive-banner", "centered-serif", "cv-academic", "minimal-clean"]);

export function isAtsSafeFamily(family: LayoutFamily): boolean {
  return ATS_SAFE_FAMILIES.has(family);
}

export interface AtsCheckItem {
  id: string;
  label: string;
  passed: boolean;
  hint: string;
}

export interface HealthCheckInput {
  contactEmail: string;
  contactPhone: string;
  templateFamily: LayoutFamily;
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  achievements: AchievementEntry[];
  answers: Record<string, string>;
  summary: string;
}

/**
 * Structural ATS-friendliness checks, computed live from whatever's
 * currently in the edit form — no save or network round-trip needed. This
 * intentionally checks structure/completeness, not writing quality.
 */
export function runHealthChecks(input: HealthCheckInput): { items: AtsCheckItem[]; score: number } {
  const hasAnswer = Object.values(input.answers).some((v) => !!v && v.trim().length > 0);

  const items: AtsCheckItem[] = [
    {
      id: "email",
      label: "Contact email provided",
      passed: !!input.contactEmail.trim(),
      hint: "ATS systems and recruiters both rely on this to reach you. Without it, you may not get contacted at all.",
    },
    {
      id: "phone",
      label: "Contact phone provided",
      passed: !!input.contactPhone.trim(),
      hint: "A phone number is a standard, expected field, and its absence can itself look incomplete to some ATS parsers.",
    },
    {
      id: "template",
      label: "Single column, ATS friendly template",
      passed: isAtsSafeFamily(input.templateFamily),
      hint: "Sidebar/banner/card layouts look great to a person but can scramble or drop text when an ATS parses across columns instead of down them.",
    },
    {
      id: "experience",
      label: "At least one work experience entry",
      passed: input.experience.length > 0,
      hint: "Work history is one of the first sections most ATS systems look for.",
    },
    {
      id: "education",
      label: "At least one education entry",
      passed: input.education.length > 0,
      hint: "Most ATS systems parse a dedicated Education section separately from work history.",
    },
    {
      id: "achievements",
      label: "Key achievements added",
      passed: input.achievements.length > 0,
      hint: "These turn into your resume's impact focused bullets. Without them, your bullets fall back to generic phrasing.",
    },
    {
      id: "answers",
      label: "Profession specific skills/answers filled in",
      passed: hasAnswer,
      hint: "This is where tools, certifications, and skill keywords live as discrete, parseable text, exactly what ATS keyword matching looks for.",
    },
    {
      id: "summary",
      label: "Summary generated",
      passed: !!input.summary.trim(),
      hint: "A short summary near the top gives both ATS systems and recruiters immediate context.",
    },
  ];

  const passedCount = items.filter((i) => i.passed).length;
  const score = Math.round((passedCount / items.length) * 100);
  return { items, score };
}

/**
 * Words too common to be meaningful keyword matches, on top of a plain
 * length filter. Sep 2026 QA pass (UX-06): the original list only covered
 * generic filler common to most job postings (the, your, responsibilities,
 * ...) — a posting for a hands-on role (delivery, warehouse, retail,
 * healthcare) leans on plain-English verbs and connector words describing
 * physical duties ("delivers packages to homes and businesses along an
 * assigned route") rather than named tools or certifications, and those
 * words are exactly as frequent as real skill terms, so simple
 * word-frequency ranking surfaced them as "keywords you keep missing"
 * instead of anything a candidate could actually add to their resume.
 * Expanded with common duty/connector words from that class of posting,
 * plus generic HR/posting boilerplate this list was still missing.
 */
const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "with", "this", "that", "from", "have", "has",
  "will", "our", "their", "they", "them", "into", "about", "than", "then", "were", "was", "been", "being",
  "who", "what", "when", "where", "why", "how", "all", "any", "can", "could", "should", "would", "may", "might",
  "must", "shall", "must", "each", "such", "some", "more", "most", "other", "these", "those", "which",
  "job", "role", "work", "team", "years", "year", "including", "etc", "also", "within", "across", "per",
  "per", "using", "use", "used", "ability", "strong", "excellent", "including", "responsibilities",
  "requirements", "required", "preferred", "please", "apply", "candidate", "candidates", "we're", "we'll",
  // Generic verbs/connectors describing duties rather than naming a skill —
  // frequent in hands-on/physical-labor postings especially.
  "along", "assigned", "assign", "assigns", "businesses", "homes", "packages", "package", "delivers",
  "deliver", "delivering", "delivery", "sorts", "sort", "sorting", "collects", "collect", "collecting",
  "handles", "handle", "handling", "performs", "perform", "performing", "performed", "provides", "provide",
  "providing", "provided", "ensures", "ensure", "ensuring", "ensured", "maintains", "maintain",
  "maintaining", "maintained", "assists", "assist", "assisting", "assisted", "completes", "complete",
  "completing", "completed", "various", "multiple", "daily", "day", "days", "time", "times", "area",
  "areas", "location", "locations", "customer", "customers", "duties", "duty", "tasks", "task", "position",
  "positions", "company", "companies", "employee", "employees", "environment", "schedule", "shift",
  "shifts", "hour", "hours", "physical", "needed", "needs", "need", "looking", "seeking", "opportunity",
  "opportunities", "ideal", "great", "good", "well", "make", "makes", "making", "take", "takes", "taking",
  "get", "gets", "getting", "help", "helps", "helping", "helped", "including", "based", "basis",
  // Second real-world pass (a warehouse/delivery posting) surfaced another
  // batch of the same class of word — generic enough to describe almost
  // any physical-labor duty, not specific enough to be worth adding to a
  // resume. Deliberately NOT filtering genuinely resume-worthy terms from
  // that same posting (driver, truck, machinery, license, valid) — "valid
  // driver's license" and "operates heavy machinery" are real, addable
  // skills, unlike "able" or "organized" on their own.
  "able", "assistant", "organized", "organize", "organizing", "organization", "organizations", "move",
  "moving", "moved", "store", "stores", "storing", "stored", "items", "item", "products", "product",
  "proper", "properly", "efficient", "efficiently", "monitors", "monitor", "monitoring", "quality",
  "pace", "paced", "independently", "independent", "detail", "details", "attention", "regulations",
  "regulation", "procedure", "procedures", "dictated", "dictate", "follow", "follows", "following",
  "state", "stand", "sit", "squat", "walk", "climb", "lift", "pounds", "verbal", "written",
  "communication", "receive", "received", "receiving", "report", "reports", "reporting", "supervisor",
  "remove", "removing", "removed", "update", "updates", "updating", "logs", "process", "processing",
  "space", "free", "debris", "hazards", "aisles", "active", "member", "complete", "goals", "degree",
  "equivalent", "during", "course", "excellent",
]);

interface KeywordCount {
  word: string;
  count: number;
}

/** Tokenizes text into lowercase words 4+ letters long, excluding stopwords, ranked by frequency (most-mentioned first). */
export function extractKeywords(text: string, max = 20): KeywordCount[] {
  const counts = new Map<string, number>();
  const words = text.toLowerCase().match(/[a-z][a-z+.#-]{2,}/g) ?? [];
  for (const raw of words) {
    const word = raw.replace(/^[-.#]+|[-.#]+$/g, "");
    if (word.length < 4 || STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

export interface KeywordMatchResult {
  matched: KeywordCount[];
  missing: KeywordCount[];
}

/**
 * Ranks the job description's most-repeated meaningful words, then checks
 * which ones already appear somewhere in the resume's own text (bullets,
 * answers, experience, education, achievements, summary). Deliberately a
 * plain word-frequency comparison, not an AI call — see
 * ContentGenerator.ts's header comment for why nothing in this app makes a
 * live LLM/network call during a page interaction.
 */
export function matchKeywords(jobDescription: string, resumeText: string, max = 20): KeywordMatchResult {
  const jdKeywords = extractKeywords(jobDescription, max);
  const resumeLower = resumeText.toLowerCase();
  const matched: KeywordCount[] = [];
  const missing: KeywordCount[] = [];
  for (const kw of jdKeywords) {
    (resumeLower.includes(kw.word) ? matched : missing).push(kw);
  }
  return { matched, missing };
}

/** Flattens every text field of a resume-in-progress into one blob for keyword matching. */
export function buildResumeTextBlob(input: {
  title: string;
  professionLabel: string;
  summary: string;
  bullets: string[];
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  awards: AwardEntry[];
  achievements: AchievementEntry[];
  answers: Record<string, string>;
  /** Optional — omitted entirely for non-Premium templates, which don't have this section (see ResumeEditPage's usesSkillsAndTools). */
  skillsAndTools?: { label: string }[];
  /** Optional — languages this resume lists, if any. */
  languages?: { language: string }[];
}): string {
  const parts: string[] = [input.title, input.professionLabel, input.summary, ...input.bullets];
  for (const job of input.experience) parts.push(job.title, job.company);
  for (const school of input.education) parts.push(school.degree, school.fieldOfStudy, school.school);
  for (const award of input.awards) parts.push(award.title, award.issuer, award.description ?? "");
  for (const a of input.achievements) parts.push(a.challenge, a.action, a.result);
  for (const value of Object.values(input.answers)) parts.push(value);
  for (const item of input.skillsAndTools ?? []) parts.push(item.label);
  for (const lang of input.languages ?? []) parts.push(lang.language);
  return parts.filter(Boolean).join(" \n ");
}
