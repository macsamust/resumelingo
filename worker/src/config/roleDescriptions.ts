/**
 * Generic, professionally-worded descriptions of what makes someone
 * successful in a given line of work — used by ContentGenerator to build
 * the "Other" profession's About statement around the role keyword pulled
 * from the resume's title (e.g. "Comedian Resume" -> "Comedian"), and to
 * give every named profession (config/professions.ts) its own voice.
 *
 * There's no live search/AI call wired into resume generation (content
 * generation runs synchronously on every save — see ResumeService.update —
 * so an external network dependency there would add latency, cost, and a
 * new failure mode for something that needs to return instantly). Instead
 * this is a curated set of role profiles, written in the same voice a
 * search for "what makes a successful {role}" would turn up, with a
 * generic-but-still-professional fallback for any role that isn't matched.
 *
 * The About statement reads as a comma appositive — "A successful
 * {category}, {descriptor} who combines..." — so `category` is the broad
 * field noun (e.g. "entertainer") and `descriptor` further specifies it
 * (e.g. "versatile public performer") without repeating the same noun.
 *
 * Unlike server/'s version (see server/src/config/roleDescriptions.ts),
 * this stays a plain static array rather than a DB-backed, admin-editable
 * table — the admin console is out of scope for this port. This is exactly
 * the shape server/'s table was seeded from (see
 * server/src/repositories/RoleDescriptionRepository.ts's
 * DEFAULT_ROLE_DESCRIPTIONS), just read directly instead of through a cache.
 */
export interface RoleDescription {
  /** Matched against the role text (case-insensitive, substring match). Empty for professionKey-matched and fallback rows. */
  keywords: string[];
  /** Broad field noun, e.g. "entertainer". Spliced into "A successful {category}, ...". Also this row's unique key. */
  category: string;
  /** e.g. "versatile public performer" — spliced right after the category as an appositive. */
  descriptor: string;
  /** Exactly three traits, spliced into "combines X, Y, and Z". */
  traits: [string, string, string];
  /** e.g. "evoke laughter" — spliced into "... to {outcome}." */
  outcome: string;
  /** Exactly three traits, spliced into "Key traits include X, Y, and Z." */
  keyTraits: [string, string, string];
  /** True for the single row used when no keyword matches — see GENERIC_ROLE_DESCRIPTION below. */
  isFallback?: boolean;
  /**
   * Matches this row directly to one of the named professions (see
   * config/professions.ts), e.g. "software-engineer", instead of via
   * keyword substring — see findRoleDescriptionForProfession below.
   * Undefined for the "Other" sub-category rows (keyword-matched) and the
   * generic fallback row.
   */
  professionKey?: string;
}

export const DEFAULT_ROLE_DESCRIPTIONS: RoleDescription[] = [
  {
    keywords: ["comedian", "comedy"],
    category: "entertainer",
    descriptor: "versatile public performer",
    traits: ["sharp writing", "deep audience connection", "precise timing"],
    outcome: "evoke laughter",
    keyTraits: ["originality", "an authentic stage persona", "strong resilience under pressure"],
  },
  {
    keywords: ["actor", "actress", "performer"],
    category: "performer",
    descriptor: "versatile performing artist",
    traits: ["emotional range", "disciplined preparation", "commanding stage presence"],
    outcome: "bring a character to life",
    keyTraits: ["adaptability", "collaborative instincts", "resilience through rejection"],
  },
  {
    keywords: ["musician", "singer", "vocalist", "songwriter", "band"],
    category: "musician",
    descriptor: "dedicated performing artist",
    traits: ["technical musicianship", "creative expression", "consistent stage energy"],
    outcome: "move an audience",
    keyTraits: ["discipline", "originality", "collaborative chemistry"],
  },
  {
    keywords: ["writer", "author", "novelist", "journalist", "blogger", "copywriter"],
    category: "writer",
    descriptor: "disciplined storyteller",
    traits: ["a distinct voice", "rigorous research", "careful revision"],
    outcome: "communicate ideas clearly",
    keyTraits: ["curiosity", "persistence", "meticulous attention to detail"],
  },
  {
    keywords: ["chef", "cook", "culinary", "baker"],
    category: "chef",
    descriptor: "skilled culinary professional",
    traits: ["technical precision", "creative flavor pairing", "composure under pressure"],
    outcome: "deliver a memorable dining experience",
    keyTraits: ["consistency", "kitchen discipline", "leadership in a fast-paced environment"],
  },
  {
    keywords: ["photographer", "photography", "videographer", "filmmaker"],
    category: "photographer",
    descriptor: "detail-oriented visual storyteller",
    traits: ["a strong creative eye", "technical mastery of light and composition", "clear client communication"],
    outcome: "capture lasting images",
    keyTraits: ["patience", "adaptability", "a distinctive creative style"],
  },
  {
    keywords: ["artist", "painter", "illustrator", "sculptor", "designer"],
    category: "artist",
    descriptor: "versatile creative professional",
    traits: ["a distinct visual style", "technical craftsmanship", "openness to feedback"],
    outcome: "bring ideas to life visually",
    keyTraits: ["originality", "discipline", "resilience through iteration"],
  },
  {
    keywords: ["coach", "trainer", "instructor", "tutor"],
    category: "coach",
    descriptor: "motivating and knowledgeable mentor",
    traits: ["clear instruction", "individualized guidance", "consistent encouragement"],
    outcome: "help others reach their goals",
    keyTraits: ["patience", "adaptability", "genuine investment in others' success"],
  },
  {
    keywords: ["consultant", "advisor", "freelance", "entrepreneur", "founder"],
    category: "consultant",
    descriptor: "resourceful independent professional",
    traits: ["strategic thinking", "clear communication", "hands-on problem-solving"],
    outcome: "deliver results clients can rely on",
    keyTraits: ["adaptability", "initiative", "strong follow-through"],
  },
  {
    keywords: ["athlete", "player"],
    category: "athlete",
    descriptor: "highly disciplined competitor",
    traits: ["rigorous training", "mental toughness", "teamwork under pressure"],
    outcome: "perform at a consistently high level",
    keyTraits: ["discipline", "resilience", "a competitive drive"],
  },
  {
    keywords: [],
    category: "professional",
    descriptor: "dedicated, results-oriented individual",
    traits: ["clear communication", "sound judgment", "steady follow-through"],
    outcome: "consistently deliver strong results",
    keyTraits: ["adaptability", "attention to detail", "a strong work ethic"],
    isFallback: true,
  },

  // One row per named profession (see config/professions.ts) — matched by
  // professionKey rather than a keyword, and used by ContentGenerator's
  // buildSummary (not buildOtherSummary) to give each profession its own
  // voice instead of one shared generic sentence.
  {
    keywords: [],
    professionKey: "software-engineer",
    category: "software-engineer",
    descriptor: "resourceful problem-solver",
    traits: ["clean, maintainable code", "systems-level thinking", "close collaboration with cross-functional teams"],
    outcome: "ship reliable software faster",
    keyTraits: ["clear technical communication", "ownership", "a habit of continuous learning"],
  },
  {
    keywords: [],
    professionKey: "nurse",
    category: "nurse",
    descriptor: "compassionate, detail-driven clinician",
    traits: ["thorough patient assessment", "calm decision-making under pressure", "close coordination with care teams"],
    outcome: "deliver safe, high-quality patient care",
    keyTraits: ["empathy", "clinical precision", "steady composure in high-stakes moments"],
  },
  {
    keywords: [],
    professionKey: "teacher",
    category: "teacher",
    descriptor: "engaging, student-focused educator",
    traits: ["clear lesson design", "differentiated instruction", "consistent classroom management"],
    outcome: "help every student reach their potential",
    keyTraits: ["patience", "creativity", "genuine investment in student growth"],
  },
  {
    keywords: [],
    professionKey: "executive",
    category: "executive",
    descriptor: "strategic, results-driven leader",
    traits: ["long-range strategic planning", "cross-functional leadership", "disciplined financial stewardship"],
    outcome: "drive sustainable organizational growth",
    keyTraits: ["decisiveness", "clear executive communication", "a track record of accountability"],
  },
  {
    keywords: [],
    professionKey: "project-manager",
    category: "project-manager",
    descriptor: "organized, delivery-focused coordinator",
    traits: ["disciplined scope and timeline management", "proactive risk mitigation", "clear stakeholder communication"],
    outcome: "keep complex projects on time and on budget",
    keyTraits: ["organization", "adaptability", "steady follow-through under shifting priorities"],
  },
  {
    keywords: [],
    professionKey: "government-contractor",
    category: "government-contractor-profession",
    descriptor: "compliance-minded program professional",
    traits: ["rigorous regulatory compliance", "disciplined program execution", "close coordination with government stakeholders"],
    outcome: "deliver on contract commitments with full accountability",
    keyTraits: ["attention to detail", "integrity", "dependable follow-through"],
  },
  {
    keywords: [],
    professionKey: "military",
    category: "military-profession",
    descriptor: "disciplined, mission-focused leader",
    traits: ["operational planning under pressure", "team leadership and training", "sound judgment in high-stakes situations"],
    outcome: "accomplish the mission and bring the team along",
    keyTraits: ["discipline", "resilience", "unwavering reliability"],
  },
  {
    keywords: [],
    professionKey: "sales",
    category: "sales",
    descriptor: "relationship-driven closer",
    traits: ["consultative needs discovery", "persistent pipeline management", "skilled objection handling"],
    outcome: "consistently exceed revenue targets",
    keyTraits: ["persistence", "active listening", "a competitive drive"],
  },
  {
    keywords: [],
    professionKey: "marketing",
    category: "marketing",
    descriptor: "data-informed brand storyteller",
    traits: ["compelling campaign strategy", "rigorous performance analysis", "creative, audience-first messaging"],
    outcome: "grow brand awareness and measurable engagement",
    keyTraits: ["creativity", "analytical rigor", "a strong sense of audience"],
  },
  {
    keywords: [],
    professionKey: "construction",
    category: "construction",
    descriptor: "safety-focused site leader",
    traits: ["hands-on crew supervision", "rigorous site safety standards", "precise project scheduling"],
    outcome: "deliver projects safely, on time, and to spec",
    keyTraits: ["reliability", "attention to detail", "steady leadership under deadline pressure"],
  },
];

/** Hardcoded ultimate fallback — the single row used when no keyword matches. */
export const GENERIC_ROLE_DESCRIPTION: RoleDescription = DEFAULT_ROLE_DESCRIPTIONS.find((r) => r.isFallback)!;

export function findRoleDescription(role: string): RoleDescription {
  const lower = role.toLowerCase();
  const matched = DEFAULT_ROLE_DESCRIPTIONS.find(
    (r) => !r.isFallback && !r.professionKey && r.keywords.some((k) => lower.includes(k))
  );
  if (matched) return matched;
  return GENERIC_ROLE_DESCRIPTION;
}

/**
 * Looks up the row matched directly to a named profession (e.g.
 * "software-engineer"), used by ContentGenerator.buildSummary for every
 * profession except "Other". Returns undefined (rather than falling back to
 * the generic row) so the caller can fall back to its own older sentence
 * template.
 */
export function findRoleDescriptionForProfession(professionKey: string): RoleDescription | undefined {
  return DEFAULT_ROLE_DESCRIPTIONS.find((r) => r.professionKey === professionKey);
}
