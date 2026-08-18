import { jsPDF } from "jspdf";
import { PublicResume, ReferenceEntry } from "../types";
import { formatMonth, sortAwards, sortByDateRange } from "../components/builder/ResumePreview";
import { groupAchievementsByExperience } from "./starBullet";
import { getTemplateStyle } from "../config/templateStyles";

/**
 * True, downloadable PDF export — real selectable/searchable text laid out
 * with jsPDF, not a browser print-to-PDF (see "Print / Save as PDF" on
 * PublicResumePage, which just calls window.print()) and not a rasterized
 * screenshot (html2canvas-style approaches produce an image, not real text,
 * which would defeat the whole point for an ATS-focused app — see
 * utils/atsCheck.ts). Runs entirely in the browser: no backend call, no new
 * server/worker code, same "nothing here ever leaves the browser" approach
 * already used for keyword matching.
 *
 * Deliberately one clean, single-column, ATS-safe layout rather than a
 * pixel-perfect reproduction of all ~13 on-screen templates (sidebars,
 * banners, photo grids) — replicating every template's visual design in a
 * hand-laid-out PDF would be a huge surface area for comparatively little
 * benefit, since the whole point of an ATS-safe export is that it reads
 * top-to-bottom in one column anyway (see atsCheck.ts's ATS_SAFE_FAMILIES).
 * Content and order mirror resumeToPlainText in PublicResumePage.tsx so the
 * two exports never drift apart.
 */

const PAGE_MARGIN = 54; // 0.75in at 72pt/in
const LINE_HEIGHT = 14;
const FONT = "helvetica";

class ResumePdfWriter {
  private readonly doc: jsPDF;
  private readonly pageWidth: number;
  private readonly pageHeight: number;
  private readonly contentWidth: number;
  private y: number;

  constructor() {
    this.doc = new jsPDF({ unit: "pt", format: "letter" });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - PAGE_MARGIN * 2;
    this.y = PAGE_MARGIN;
  }

  private ensureSpace(height: number): void {
    if (this.y + height > this.pageHeight - PAGE_MARGIN) {
      this.doc.addPage();
      this.y = PAGE_MARGIN;
    }
  }

  private writeLines(text: string, size: number, style: "normal" | "bold" | "italic" = "normal", gapAfter = 0): void {
    if (!text) return;
    this.doc.setFont(FONT, style);
    this.doc.setFontSize(size);
    const lines: string[] = this.doc.splitTextToSize(text, this.contentWidth);
    for (const line of lines) {
      this.ensureSpace(LINE_HEIGHT);
      this.doc.text(line, PAGE_MARGIN, this.y);
      this.y += LINE_HEIGHT;
    }
    this.y += gapAfter;
  }

  name(text: string): void {
    this.writeLines(text || "Untitled", 20, "bold", 2);
  }

  subtitle(text: string): void {
    this.writeLines(text, 12, "normal", 4);
  }

  sectionHeading(text: string): void {
    this.ensureSpace(LINE_HEIGHT + 6);
    this.y += 4;
    this.doc.setFont(FONT, "bold");
    this.doc.setFontSize(11);
    this.doc.text(text.toUpperCase(), PAGE_MARGIN, this.y);
    this.y += 3;
    this.doc.setDrawColor(180);
    this.doc.line(PAGE_MARGIN, this.y, PAGE_MARGIN + this.contentWidth, this.y);
    this.y += LINE_HEIGHT;
  }

  entryTitle(text: string): void {
    this.writeLines(text, 11, "bold");
  }

  body(text: string): void {
    this.writeLines(text, 10.5, "normal");
  }

  bullet(text: string): void {
    if (!text) return;
    this.doc.setFont(FONT, "normal");
    this.doc.setFontSize(10.5);
    const indent = 12;
    const lines: string[] = this.doc.splitTextToSize(text, this.contentWidth - indent);
    lines.forEach((line, i) => {
      this.ensureSpace(LINE_HEIGHT);
      this.doc.text(i === 0 ? `•  ${line}` : line, PAGE_MARGIN + (i === 0 ? 0 : indent), this.y);
      this.y += LINE_HEIGHT;
    });
  }

  spacer(amount = 6): void {
    this.y += amount;
  }

  save(filename: string): void {
    this.doc.save(filename);
  }
}

function formatAnswerLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatReferenceDateRange(ref: ReferenceEntry): string {
  const start = ref.dateObservedStart ? formatMonth(ref.dateObservedStart) : "";
  const end = ref.dateObservedEnd ? formatMonth(ref.dateObservedEnd) : "";
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

export function downloadResumePdf(resume: PublicResume): void {
  const w = new ResumePdfWriter();

  if (resume.fullName) w.name(resume.fullName);
  w.subtitle(resume.title || "Untitled Resume");
  const contactLine = [resume.contactEmail, resume.contactPhone, resume.contactLinkedIn].filter(Boolean).join("   |   ");
  if (contactLine) w.subtitle(contactLine);
  w.spacer(4);

  if (resume.generatedSummary) {
    w.sectionHeading("Summary");
    w.body(resume.generatedSummary);
    w.spacer();
  }

  const bulletsLabel = getTemplateStyle(resume.templateKey).bulletsLabel;
  const grouped = resume.combineExperienceFormat
    ? groupAchievementsByExperience(resume.achievements ?? [], resume.experience ?? [])
    : null;

  const experience = resume.experience?.length ? sortByDateRange(resume.experience) : [];
  if (experience.length > 0) {
    w.sectionHeading("Experience");
    for (const job of experience) {
      const dates = `${formatMonth(job.startDate)} – ${job.current ? "Present" : formatMonth(job.endDate)}`;
      const location = [job.city, job.state].filter(Boolean).join(", ");
      w.entryTitle(
        `${job.title || "Untitled role"}${job.company ? `, ${job.company}` : ""}${location ? `, ${location}` : ""} (${dates})`
      );
      if (grouped && job.id) {
        for (const bullet of grouped.byExperienceId[job.id] ?? []) w.bullet(bullet);
      }
      w.spacer(4);
    }
  }

  const education = resume.education?.length ? sortByDateRange(resume.education) : [];
  if (education.length > 0) {
    w.sectionHeading("Education");
    for (const school of education) {
      const degreeLine = [school.degree, school.fieldOfStudy].filter(Boolean).join(", ");
      const dates = `${formatMonth(school.startDate)} – ${school.current ? "Present" : formatMonth(school.endDate)}`;
      w.entryTitle(`${degreeLine}${school.school ? `, ${school.school}` : ""} (${dates})`);
    }
    w.spacer();
  }

  const highlightBullets = grouped ? grouped.unlinked : resume.generatedBullets ?? [];
  if (highlightBullets.length > 0) {
    w.sectionHeading(bulletsLabel);
    for (const bullet of highlightBullets) w.bullet(bullet);
    w.spacer();
  }

  const skills = resume.skillsAndTools?.filter((s) => s.category === "skill") ?? [];
  const tools = resume.skillsAndTools?.filter((s) => s.category === "tool") ?? [];
  if (skills.length > 0 || tools.length > 0) {
    w.sectionHeading("Skills & Tools");
    if (skills.length > 0) w.body(`Skills: ${skills.map((s) => s.label).join(", ")}`);
    if (tools.length > 0) w.body(`Tools: ${tools.map((s) => s.label).join(", ")}`);
    w.spacer();
  }

  const awards = resume.awards?.length ? sortAwards(resume.awards) : [];
  if (awards.length > 0) {
    w.sectionHeading("Awards");
    for (const award of awards) {
      w.entryTitle(`${award.title || "Untitled award"}${award.issuer ? `, ${award.issuer}` : ""} (${formatMonth(award.date)})`);
      if (award.description) w.body(award.description);
    }
    w.spacer();
  }

  const answerEntries = Object.entries(resume.answers).filter(([, v]) => v && v.trim());
  if (answerEntries.length > 0) {
    w.sectionHeading("Additional Details");
    for (const [key, value] of answerEntries) {
      w.body(`${formatAnswerLabel(key)}: ${value}`);
    }
    w.spacer();
  }

  const referencesForExport = resume.references?.length ? resume.references : resume.recruiterCard?.references ?? [];
  if (referencesForExport.length > 0) {
    w.sectionHeading("References");
    for (const ref of referencesForExport) {
      const roleLine = [ref.companyPosition, ref.company].filter(Boolean).join(", ");
      w.entryTitle(`${ref.name || "Untitled reference"}${roleLine ? `, ${roleLine}` : ""}`);
      const contactLine2 = [ref.email, ref.phone].filter(Boolean).join("   |   ");
      if (contactLine2) w.body(contactLine2);
      const detailLine = [ref.affiliation, formatReferenceDateRange(ref)].filter(Boolean).join(" — ");
      if (detailLine) w.body(detailLine);
      w.spacer(4);
    }
  }

  const filename = `${(resume.title || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "resume"}.pdf`;
  w.save(filename);
}
