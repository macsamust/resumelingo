/**
 * Visual styling for the 15 resume templates (see server/src/config/templates.ts
 * and worker/src/config/templates.ts for the canonical name/description list —
 * this file is client-only presentation, so it doesn't need a backend twin).
 *
 * Each template is distinct along three axes:
 *   - font: its own typeface pairing (loaded via Google Fonts in index.html),
 *     not just a sans/serif toggle.
 *   - format: one of five structural layout "families" (rendered in
 *     ResumePreview.tsx), each further varied by alignment (sideAlign /
 *     bannerAlign) so templates sharing a family still look structurally
 *     different, not just recolored.
 *   - flow: the order content renders in. "bullets-first" templates lead
 *     with achievements (the convention for skills/impact-driven resumes);
 *     "summary-first" templates lead with narrative framing. Section labels
 *     (summaryLabel / bulletsLabel) also vary per template's tone.
 */
export type LayoutFamily =
  | "executive-banner"
  | "sidebar"
  | "centered-serif"
  | "cv-academic"
  | "minimal-clean"
  | "timeline-sidebar"
  | "photo-banner-sidebar"
  | "corner-photo-sidebar"
  | "photo-sidebar-underline"
  | "pill-grid-cards";
export type Flow = "summary-first" | "bullets-first";

export interface TemplateStyle {
  family: LayoutFamily;
  accent: string;
  accentSoft: string;
  font: string; // CSS font-family stack
  flow: Flow;
  summaryLabel: string;
  bulletsLabel: string;
  /** Overrides the Work Experience section's label — defaults to "Experience" (see ResumePreview.tsx). Added for "ATS Optimized," whose whole premise is using the exact section wording an ATS parser is trained to recognize ("Work Experience"), rather than every other template's shorter default. */
  experienceLabel?: string;
  /** Overrides the Education section's label — defaults to "Education" (see ResumePreview.tsx). */
  educationLabel?: string;
  /** Overrides the Awards section's label — defaults to "Awards" (see ResumePreview.tsx). */
  awardsLabel?: string;
  /** Overrides the Skills & Tools section's two group labels — default to "Skills"/"Tools" (see ResumePreview.tsx). */
  skillsLabel?: string;
  toolsLabel?: string;
  /**
   * A short label rendered on the resume itself (via .tpl-badge — inside
   * .preview-panel, so unlike templateTag it's real content: it appears on
   * the public resume link and gets included in what a recruiter actually
   * sees). Reserve this for something true of the *candidate* that belongs
   * on the document — "Veteran" (military-transition) is the one case that
   * qualifies, since plenty of real resumes self-identify that way for
   * veteran-hiring programs. Do NOT use this for anything describing the
   * *template* itself (a layout style, an ATS-safety claim, a tone like
   * "Fast Moving") — that's metadata about a choice made in the builder,
   * not something the candidate is asserting about themselves, and it reads
   * strangely showing up verbatim on a document sent to an employer. The
   * template's own name (shown via templateTag, builder-only — see its doc
   * comment — and via the template picker's tier/ATS tags in
   * ResumeEditPage.tsx) is where that kind of description belongs instead.
   */
  badge?: string;
  sideAlign?: "left" | "right"; // sidebar family only
  bannerAlign?: "left" | "center"; // executive-banner family only
  /** executive-banner family only — colors just the name (not the title/contact line, which stay white) in the template's accentSoft tone instead of white, for a gold-on-navy look. */
  accentName?: boolean;
  /** executive-banner family only — a small diagonal accentSoft-colored triangle clipped into the banner's top right corner, purely decorative (web preview/public page only; the PDF export builds its own plain layout and never reads this). */
  cornerAccent?: boolean;
  /**
   * photo-sidebar-underline family only:
   *   - "banner" wraps the header text in a solid accent-color block with a
   *     bordered box around the name, photo left-aligned beside it, instead
   *     of the family's default plain white header.
   *   - "banner-center" is a full-width solid accent-color header with
   *     everything centered — photo/initials badge, name, and title all
   *     stacked and centered, rather than side-by-side. Used by templates
   *     with no uploaded-photo emphasis (see "emblem").
   */
  headerVariant?: "banner" | "banner-center";
  /** Overrides the header contact line's separator — defaults to " · " (see ResumePreview.tsx's contactLine). Added for "ATS Optimized," which uses " | " to match the plain, parser-friendly punctuation real ATS-safe resumes tend to use instead of a typographic dot. */
  contactSeparator?: string;
  /** Overrides the Skills & Tools section's within-group keyword separator — defaults to ", " (see ResumePreview.tsx's skillsAndToolsBlock). Added for "ATS Optimized," matching its " | " contactSeparator instead of comma-separated prose. */
  skillsSeparator?: string;
  /**
   * Single-column family (centered-serif/cv-academic/minimal-clean/
   * executive-banner) only: moves Education out of its usual place right
   * after Experience/before the achievement bullets, rendering it instead
   * between Skills & Tools and Languages, near the end of the resume. Added
   * for "ATS Optimized" at the person's request — every other template
   * keeps the standard Summary/Experience/Education/Achievements order (see
   * ResumePreview.tsx's orderedSections).
   */
  educationAfterSkills?: boolean;
  /**
   * Single-column family only: moves Skills & Tools out of its usual place
   * near the end of the resume, rendering it instead right after the
   * Summary section, before Experience. Added for "Boardroom" at the
   * person's request.
   */
  skillsAfterSummary?: boolean;
  /**
   * Single-column family only: renders the header contact line (email,
   * phone, city/state, LinkedIn) as a small centered line at the very
   * bottom of the resume instead of inside the header — added for
   * "Boardroom," whose banner header is meant to carry only the name and
   * title, with contact details tucked away as a footer instead of
   * competing for attention up top.
   */
  contactInFooter?: boolean;
  /**
   * Colors just the first word of the person's full name in this hex value,
   * leaving the rest of the name in its normal color — added for
   * "Government" at the person's request, so the name reads with a
   * deliberate accent even though the template otherwise keeps a muted,
   * traditional palette. Single-column family only (see ResumePreview.tsx's
   * fullNameNode).
   */
  firstNameAccent?: string;
  /**
   * Shows a 5-dot proficiency meter next to each Languages entry, alongside
   * (not instead of) the existing "Language, Proficiency" text — see
   * ResumePreview.tsx's languagesBlock and utils/languageProficiency.ts's
   * proficiencyLevel. Off by default so every template's Languages section
   * is unchanged unless explicitly opted in — added for "Government" at the
   * person's request, but not tied to any one family/font/etc., so any
   * other template can flip this on later without new plumbing.
   */
  languageProficiencyMeter?: boolean;
}

const SERIF_ELEGANT = `'Playfair Display', Georgia, 'Times New Roman', serif`;
const SERIF_TRADITIONAL = `'Merriweather', Georgia, 'Times New Roman', serif`;
const SERIF_LITERARY = `'Lora', Georgia, serif`;
const SANS_MODERN = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
const SANS_GEOMETRIC = `'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
const SANS_CORPORATE = `'Source Sans 3', 'Segoe UI', Roboto, sans-serif`;
const SANS_TECHNICAL = `'IBM Plex Sans', 'Segoe UI', Roboto, sans-serif`;

const DEFAULT_STYLE: TemplateStyle = {
  family: "sidebar",
  accent: "#4f46e5",
  accentSoft: "#eef2ff",
  font: SANS_MODERN,
  flow: "summary-first",
  summaryLabel: "Summary",
  bulletsLabel: "Highlights",
};

export const TEMPLATE_STYLES: Record<string, TemplateStyle> = {
  // Executive / leadership / consulting — bold full-width banner header.
  executive: {
    family: "executive-banner", bannerAlign: "center",
    accent: "#0f172a", accentSoft: "#e2e8f0", font: SERIF_ELEGANT,
    flow: "summary-first", summaryLabel: "Executive Profile", bulletsLabel: "Key Accomplishments",
  },
  corporate: {
    family: "executive-banner", bannerAlign: "left",
    accent: "#334155", accentSoft: "#e2e8f0", font: SANS_CORPORATE,
    flow: "summary-first", summaryLabel: "Professional Summary", bulletsLabel: "Selected Contributions",
  },
  consulting: {
    family: "executive-banner", bannerAlign: "left",
    accent: "#4f46e5", accentSoft: "#eef2ff", font: SANS_CORPORATE,
    flow: "bullets-first", summaryLabel: "Profile", bulletsLabel: "Impact & Results",
  },
  "military-transition": {
    family: "executive-banner", bannerAlign: "center",
    accent: "#166534", accentSoft: "#dcfce7", font: SANS_CORPORATE,
    flow: "summary-first", summaryLabel: "Career Summary", bulletsLabel: "Service & Achievements", badge: "Veteran",
  },

  // Modern / technical / fast-moving — two-column with a colored sidebar.
  modern: {
    family: "sidebar", sideAlign: "left",
    accent: "#4f46e5", accentSoft: "#eef2ff", font: SANS_MODERN,
    flow: "summary-first", summaryLabel: "About", bulletsLabel: "Highlights",
  },
  technical: {
    family: "sidebar", sideAlign: "left",
    accent: "#0d9488", accentSoft: "#ccfbf1", font: SANS_TECHNICAL,
    flow: "bullets-first", summaryLabel: "Summary", bulletsLabel: "Technical Contributions",
  },
  startup: {
    family: "sidebar", sideAlign: "right",
    accent: "#ea580c", accentSoft: "#ffedd5", font: SANS_GEOMETRIC,
    flow: "bullets-first", summaryLabel: "Bio", bulletsLabel: "Wins",
  },
  creative: {
    family: "sidebar", sideAlign: "right",
    accent: "#a21caf", accentSoft: "#fae8ff", font: SANS_GEOMETRIC,
    flow: "summary-first", summaryLabel: "Creative Statement", bulletsLabel: "Selected Work",
  },

  // Traditional / conservative / public-sector — centered header, serif type.
  classic: {
    family: "centered-serif",
    accent: "#1e293b", accentSoft: "#e2e8f0", font: SERIF_TRADITIONAL,
    flow: "summary-first", summaryLabel: "Objective", bulletsLabel: "Experience Highlights",
  },
  // Restyled toward a plain left-gutter-labeled layout (muted uppercase
  // section labels beside their content, split name/contact header) rather
  // than Federal's centered "— SECTION —" traditional-serif look — not
  // every government/public-sector resume needs to match USAJOBS format
  // specifically, so this stays the more general-purpose option. See
  // .tpl-key-government in global.css for the actual layout overrides;
  // family/accent/flow stay centered-serif so it's still on
  // atsCheck.ts's ATS_SAFE_FAMILIES list.
  government: {
    family: "centered-serif",
    accent: "#1e3a8a", accentSoft: "#dbeafe", font: SANS_CORPORATE,
    flow: "summary-first", summaryLabel: "Qualifications Summary", bulletsLabel: "Relevant Experience",
    firstNameAccent: "#991b1b",
    // "\n" rather than a joined " · "/" | " string — paired with
    // .tpl-key-government .tpl-contact's white-space: pre-line in global.css,
    // this puts email/phone/LinkedIn each on their own line instead of one
    // dot-separated line, at the person's request for a cleaner contact
    // block. Safe to reuse contactSeparator for this since buildContactLine
    // just inserts it as literal text between items either way.
    contactSeparator: "\n",
  },
  federal: {
    family: "centered-serif",
    accent: "#0f172a", accentSoft: "#e2e8f0", font: SERIF_TRADITIONAL,
    flow: "summary-first", summaryLabel: "Qualifications Summary", bulletsLabel: "Duties & Accomplishments",
  },

  // Academic / credentialed — dense, left-aligned, small-caps section labels.
  academic: {
    family: "cv-academic",
    accent: "#1e293b", accentSoft: "#f1f5f9", font: SERIF_LITERARY,
    flow: "summary-first", summaryLabel: "Research Statement", bulletsLabel: "Selected Publications & Work",
  },
  "government-contractor": {
    family: "cv-academic",
    accent: "#0369a1", accentSoft: "#e0f2fe", font: SANS_TECHNICAL,
    flow: "bullets-first", summaryLabel: "Profile", bulletsLabel: "Contract Accomplishments",
  },

  // Minimal / whitespace-forward.
  minimalist: {
    family: "minimal-clean",
    accent: "#64748b", accentSoft: "#f8fafc", font: SANS_MODERN,
    flow: "summary-first", summaryLabel: "Summary", bulletsLabel: "Highlights",
  },
  healthcare: {
    family: "minimal-clean",
    accent: "#0d9488", accentSoft: "#f0fdfa", font: SERIF_LITERARY,
    flow: "summary-first", summaryLabel: "Clinical Summary", bulletsLabel: "Clinical Highlights",
  },

  // Full-width name/role banner over a contact-and-profile sidebar, with an
  // icon-marker timeline running down the larger main column (Skills,
  // Experience, Education, Awards each get a marker) — see ResumePreview.tsx's
  // "timeline-sidebar" branch and global.css's .tpl-timeline-sidebar rules.
  timeline: {
    family: "timeline-sidebar",
    accent: "#111827", accentSoft: "#e5e7eb", font: SANS_GEOMETRIC,
    flow: "summary-first", summaryLabel: "Profile", bulletsLabel: "Skills",
  },

  // Colored full-width banner (name/role/contact grid, plus an initials
  // badge standing in for a profile photo — the resume model has no photo
  // upload) over a two-column body: larger main column (Summary,
  // Experience, Highlights) with a circular badge marker on every
  // experience entry, and a narrower light-tint sidebar (Education, Skills,
  // Volunteer Work & Affiliations) — Highlights stays in the larger column
  // and Education in the narrower one, same rule as every other two-column
  // family (see ResumePreview.tsx's "photo-banner-sidebar" branch).
  portrait: {
    family: "photo-banner-sidebar",
    accent: "#3b6ea5", accentSoft: "#eaf3f8", font: SANS_MODERN,
    flow: "summary-first", summaryLabel: "Professional Profile", bulletsLabel: "Relevant Skills",
    awardsLabel: "Volunteer Work & Affiliations",
  },

  // Bold circular photo over an accent-color corner block, name/title beside
  // it, then a two-column body: a narrow sidebar (About Me, Contact,
  // Education) beside a main column (Experience, Expertise, Awards) — each
  // section labeled with a solid accent-color bar instead of the small
  // dot-marker label every other family uses. See ResumePreview.tsx's
  // "corner-photo-sidebar" branch and global.css's .tpl-corner-* rules.
  designer: {
    family: "corner-photo-sidebar",
    accent: "#1e2a4a", accentSoft: "#e7eaf3", font: SANS_CORPORATE,
    flow: "summary-first", summaryLabel: "About Me", bulletsLabel: "Expertise",
  },

  // Grayscale photo beside a light gray sidebar (Contact, Education,
  // Skills) — main column stays plain white (Summary, Experience) — every
  // section headed by bold tracked-letter text with a thin underline
  // instead of a colored marker. See ResumePreview.tsx's
  // "photo-sidebar-underline" branch and global.css's .tpl-mono-* rules.
  monochrome: {
    family: "photo-sidebar-underline",
    accent: "#1f2937", accentSoft: "#f2f3f4", font: SANS_MODERN,
    flow: "summary-first", summaryLabel: "Summary", bulletsLabel: "Achievements",
  },

  // Photo + name header over an intro paragraph, then a two-column grid of
  // bordered, rounded cards (Contact/Skills/Awards on the left, Experience/
  // Education on the right), each tagged with a colorful rounded pill
  // instead of a plain label. See ResumePreview.tsx's "pill-grid-cards"
  // branch and global.css's .tpl-pill-* rules.
  showcase: {
    family: "pill-grid-cards",
    accent: "#16181d", accentSoft: "#f8fafc", font: SANS_GEOMETRIC,
    flow: "summary-first", summaryLabel: "About", bulletsLabel: "Skills",
  },

  // Same photo-sidebar-underline structure as Monochrome, but with the
  // header-text half of the header wrapped in a solid navy block and a
  // bordered box around the name — see headerVariant: "banner" above and
  // .tpl-mono-header-banner in global.css.
  framed: {
    family: "photo-sidebar-underline", headerVariant: "banner",
    accent: "#1e2a4a", accentSoft: "#eef1f7", font: SANS_MODERN,
    flow: "summary-first", summaryLabel: "Profile", bulletsLabel: "Highlights",
  },

  // Full-width navy header, everything centered — a gold monogram badge
  // (initials, since this one has no photo) over the name in a bordered
  // box, then title beneath — over the same Contact/Education/Skills
  // sidebar + Profile/Experience main body as Monochrome/Framed. See
  // headerVariant: "banner-center" above and .tpl-mono-header-banner-center
  // in global.css.
  emblem: {
    family: "photo-sidebar-underline", headerVariant: "banner-center",
    accent: "#131c33", accentSoft: "#cda869", font: SERIF_ELEGANT,
    flow: "summary-first", summaryLabel: "Profile", bulletsLabel: "Highlights",
  },

  // Circular photo beside the name/title, a colored banner header, then a
  // two-column body: main column leads with Experience and Highlights
  // (Workshops & Training reuses the Awards section, relabeled), sidebar
  // has Education, Hard/Soft Skills. Reuses the photo-banner-sidebar
  // structure (Portrait) with its own accent palette and Skills & Tools labels.
  spotlight: {
    family: "photo-banner-sidebar",
    accent: "#16324a", accentSoft: "#e7f3f3", font: SANS_MODERN,
    flow: "summary-first", summaryLabel: "Profile", bulletsLabel: "Highlights",
    awardsLabel: "Workshops & Training", skillsLabel: "Hard Skills", toolsLabel: "Soft Skills",
  },

  // Reuses the executive-banner structure (full-bleed centered banner header,
  // single column below — same family as "executive"/"military-transition")
  // with its own darker slate-navy-and-warm-gold palette and "Profile
  // Summary"/"Work Experience" section wording, for a more formal, upscale
  // take on the same layout aimed squarely at senior/board level roles.
  boardroom: {
    family: "executive-banner", bannerAlign: "center",
    accent: "#1f2f3d", accentSoft: "#c9a55c", font: SERIF_ELEGANT,
    flow: "summary-first", summaryLabel: "Profile Summary", bulletsLabel: "Key Achievements",
    experienceLabel: "Work Experience",
    accentName: true, cornerAccent: true,
    contactSeparator: " | ", contactInFooter: true, educationAfterSkills: true, skillsAfterSummary: true,
  },

  // Deliberately the plainest template in the lineup — single column
  // (centered-serif family, already the layout ResumeEditPage's ATS Check
  // scores as parser safe, see client/src/utils/atsCheck.ts's
  // ATS_SAFE_FAMILIES), a neutral gray accent instead of a bold color, no
  // badge, and the exact section wording ("Summary," "Work Experience,"
  // "Education") an ATS parser is trained to recognize rather than each
  // other template's more creative relabeling. Font is still a refined
  // serif (font choice is purely visual — a Worker never reads it, and it
  // has zero effect on how an ATS actually parses the underlying text) to
  // read as a polished, traditional resume rather than a stripped down one.
  // "Professional Skills"/"Technical Skills" splits Skills & Tools the way
  // a plain two column skills block on a real ATS friendly resume usually
  // reads.
  "ats-optimized": {
    family: "centered-serif",
    accent: "#374151", accentSoft: "#e5e7eb", font: SERIF_LITERARY,
    flow: "summary-first", summaryLabel: "Summary", bulletsLabel: "Key Achievements",
    experienceLabel: "Work Experience", skillsLabel: "Professional Skills", toolsLabel: "Technical Skills",
    contactSeparator: " | ", skillsSeparator: " | ", educationAfterSkills: true,
  },
};

export function getTemplateStyle(key: string): TemplateStyle {
  return TEMPLATE_STYLES[key] ?? DEFAULT_STYLE;
}
