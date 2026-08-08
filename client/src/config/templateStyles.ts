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
export type LayoutFamily = "executive-banner" | "sidebar" | "centered-serif" | "cv-academic" | "minimal-clean" | "timeline-sidebar";
export type Flow = "summary-first" | "bullets-first";

export interface TemplateStyle {
  family: LayoutFamily;
  accent: string;
  accentSoft: string;
  font: string; // CSS font-family stack
  flow: Flow;
  summaryLabel: string;
  bulletsLabel: string;
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

  // Full-width name/role banner over a contact-and-skills sidebar, with an
  // icon-marker timeline running down the main column (Profile, Experience,
  // Education, Awards each get a marker) — see ResumePreview.tsx's
  // "timeline-sidebar" branch and global.css's .tpl-timeline-sidebar rules.
  timeline: {
    family: "timeline-sidebar",
    accent: "#111827", accentSoft: "#e5e7eb", font: SANS_GEOMETRIC,
    flow: "summary-first", summaryLabel: "Profile", bulletsLabel: "Skills",
  },
};

export function getTemplateStyle(key: string): TemplateStyle {
  return TEMPLATE_STYLES[key] ?? DEFAULT_STYLE;
}
