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
  /** Overrides the Awards section's label — defaults to "Awards" (see ResumePreview.tsx). */
  awardsLabel?: string;
  badge?: string;
  sideAlign?: "left" | "right"; // sidebar family only
  bannerAlign?: "left" | "center"; // executive-banner family only
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
    flow: "bullets-first", summaryLabel: "Profile", bulletsLabel: "Impact & Results", badge: "Metrics-Driven",
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
    flow: "bullets-first", summaryLabel: "Summary", bulletsLabel: "Technical Contributions", badge: "Skills-Forward",
  },
  startup: {
    family: "sidebar", sideAlign: "right",
    accent: "#ea580c", accentSoft: "#ffedd5", font: SANS_GEOMETRIC,
    flow: "bullets-first", summaryLabel: "Bio", bulletsLabel: "Wins", badge: "Fast-Moving",
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
  government: {
    family: "centered-serif",
    accent: "#1e3a8a", accentSoft: "#dbeafe", font: SERIF_TRADITIONAL,
    flow: "summary-first", summaryLabel: "Qualifications Summary", bulletsLabel: "Relevant Experience",
  },
  federal: {
    family: "centered-serif",
    accent: "#0f172a", accentSoft: "#e2e8f0", font: SERIF_TRADITIONAL,
    flow: "summary-first", summaryLabel: "Qualifications Summary", bulletsLabel: "Duties & Accomplishments", badge: "USAJOBS Format",
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
    flow: "bullets-first", summaryLabel: "Profile", bulletsLabel: "Contract Accomplishments", badge: "Clearance Ready",
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
    flow: "summary-first", summaryLabel: "Clinical Summary", bulletsLabel: "Clinical Highlights", badge: "Clinical",
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
  // upload) over a two-column body: main column with a circular badge
  // marker on every experience/education entry, and a light-tint sidebar
  // for skills and volunteer work/affiliations.
  portrait: {
    family: "photo-banner-sidebar",
    accent: "#3b6ea5", accentSoft: "#eaf3f8", font: SANS_MODERN,
    flow: "summary-first", summaryLabel: "Professional Profile", bulletsLabel: "Relevant Skills",
    awardsLabel: "Volunteer Work & Affiliations",
  },

  // Bold circular photo over an accent-color corner block, name/title beside
  // it, then a two-column body: a narrow sidebar (About Me, Contact,
  // Expertise) beside a main column (Experience, Education, Awards) — each
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
};

export function getTemplateStyle(key: string): TemplateStyle {
  return TEMPLATE_STYLES[key] ?? DEFAULT_STYLE;
}
