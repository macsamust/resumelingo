/**
 * Generic, professionally-worded descriptions of what makes someone
 * successful in a given line of work — used by ContentGenerator to build
 * the "Other" profession's About statement around the role keyword pulled
 * from the resume's title (e.g. "Comedian Resume" -> "Comedian").
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
 * Moved from a static array to a DB-backed table (see
 * repositories/RoleDescriptionRepository.ts and /admin/role-descriptions)
 * so an admin can edit these without a code deploy — same "reads like AI,
 * is actually a curated deterministic list" reasoning as
 * config/skillSuggestions.ts. UNLIKE that one, this keeps an in-memory
 * cache (same pattern as config/templates.ts) because findRoleDescription()
 * runs synchronously on every resume save and can't become an async DB
 * round-trip without slowing that path down.
 */
export interface RoleDescription {
  /** Matched against the role text (case-insensitive, substring match). Empty for the fallback row. */
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
}

/**
 * Seed data only, used once (see db/database.ts's seedCatalogDefaults) to
 * populate the "role_descriptions" table the first time an install boots.
 * Once seeded, the DB table — not this array — is the source of truth.
 */
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
];

/**
 * Hardcoded ultimate fallback — only used if the DB cache is somehow empty
 * (e.g. a fresh install before the first boot's seed finishes), so
 * findRoleDescription() never throws or returns undefined.
 */
export const GENERIC_ROLE_DESCRIPTION: RoleDescription = DEFAULT_ROLE_DESCRIPTIONS.find((r) => r.isFallback)!;

/**
 * In-memory cache of all role descriptions, populated at boot (see
 * index.ts) and refreshed after every admin write (see
 * repositories/RoleDescriptionRepository.ts). Kept synchronous — rather
 * than making ContentGenerator async — because findRoleDescription() runs
 * on every resume save (ResumeService.update), a path that's deliberately
 * kept instant with no network/DB round-trip per call.
 */
let cache: RoleDescription[] = [];

export function setRoleDescriptionCache(descriptions: RoleDescription[]): void {
  cache = descriptions;
}

export function findRoleDescription(role: string): RoleDescription {
  const lower = role.toLowerCase();
  const pool = cache.length > 0 ? cache : DEFAULT_ROLE_DESCRIPTIONS;
  const matched = pool.find((r) => !r.isFallback && r.keywords.some((k) => lower.includes(k)));
  if (matched) return matched;
  return pool.find((r) => r.isFallback) ?? GENERIC_ROLE_DESCRIPTION;
}
