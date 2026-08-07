import type { CSSProperties } from "react";
import { getTemplateStyle } from "../../config/templateStyles";
import { AwardEntry, EducationEntry, WorkExperienceEntry } from "../../types";

interface Props {
  fullName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  title: string;
  professionLabel: string;
  templateKey?: string;
  templateName?: string;
  summary: string;
  bullets: string[];
  experience?: WorkExperienceEntry[];
  education?: EducationEntry[];
  awards?: AwardEntry[];
}

/** Formats "YYYY-MM" (from an <input type="month">) as "Mon YYYY", e.g. "2021-05" -> "May 2021". */
function formatMonth(value: string | null | undefined): string {
  if (!value) return "";
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Chronological order for a "date range" entry (work experience, education):
 * current first, then most recently ended, falling back to start date as a
 * tiebreak. Sorting happens here (rather than wherever the list is edited)
 * so every place that renders a resume — builder preview, edit preview, and
 * the public page — is guaranteed to show the same order regardless of the
 * order entries were added.
 */
function sortByDateRange<T extends { current: boolean; startDate: string; endDate: string | null }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    const aKey = (a.current ? null : a.endDate) || a.startDate || "";
    const bKey = (b.current ? null : b.endDate) || b.startDate || "";
    return aKey < bKey ? 1 : aKey > bKey ? -1 : 0;
  });
}

/** Most recent award first. */
function sortAwards(entries: AwardEntry[]): AwardEntry[] {
  return [...entries].sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : (a.date || "") > (b.date || "") ? -1 : 0));
}

/** Adds https:// to a LinkedIn URL typed without a protocol, so the link always resolves. */
function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Live preview panel — mirrors the "every change updates instantly, choose a
 * format and have it previewed" feature from the product overview.
 *
 * Visual layout is driven by the selected template's style config (see
 * config/templateStyles.ts). Every template is distinct along three axes:
 *   - font: its own typeface (config's `font` CSS stack, applied directly)
 *   - format: one of five structural layout families, further varied by
 *     sideAlign/bannerAlign so templates sharing a family aren't just
 *     recolored twins of each other
 *   - flow: no longer affects section order (summary always leads, see
 *     orderedSections below) — now only picks each template's section
 *     labels (summaryLabel/bulletsLabel) to match its tone
 */
export function ResumePreview({
  fullName,
  contactEmail,
  contactPhone,
  contactLinkedIn,
  title,
  professionLabel,
  templateKey,
  templateName,
  summary,
  bullets,
  experience = [],
  education = [],
  awards = [],
}: Props) {
  const style = getTemplateStyle(templateKey ?? "modern");
  const cssVars = {
    "--tpl-accent": style.accent,
    "--tpl-accent-soft": style.accentSoft,
    fontFamily: style.font,
  } as CSSProperties;

  const heading = title || "Untitled Resume";
  const roleLine = professionLabel;

  // Contact line: email and LinkedIn are hyperlinked (LinkedIn spelled out as
  // its full URL rather than a plain "LinkedIn" label); phone is plain text.
  const contactItems: { key: string; node: JSX.Element }[] = [];
  if (contactEmail) {
    contactItems.push({
      key: "email",
      node: (
        <a href={`mailto:${contactEmail}`} className="tpl-contact-link">
          {contactEmail}
        </a>
      ),
    });
  }
  if (contactPhone) {
    contactItems.push({ key: "phone", node: <span>{contactPhone}</span> });
  }
  if (contactLinkedIn) {
    contactItems.push({
      key: "linkedin",
      node: (
        <a href={withProtocol(contactLinkedIn)} target="_blank" rel="noreferrer" className="tpl-contact-link">
          {contactLinkedIn}
        </a>
      ),
    });
  }
  const contactLine = contactItems.length > 0 && (
    <p className="tpl-contact">
      {contactItems.map((item, i) => (
        <span key={item.key}>
          {i > 0 && <span className="tpl-contact-sep"> · </span>}
          {item.node}
        </span>
      ))}
    </p>
  );

  const summaryBlock = (
    <div className="tpl-section">
      <span className="tpl-section-label">{style.summaryLabel}</span>
      {summary ? (
        <p className="preview-summary">{summary}</p>
      ) : (
        <p className="preview-summary" style={{ color: "var(--muted)", fontStyle: "italic" }}>
          Your AI-generated summary will appear here once you save.
        </p>
      )}
    </div>
  );

  const bulletsBlock = bullets.length > 0 && (
    <div className="tpl-section">
      <span className="tpl-section-label">{style.bulletsLabel}</span>
      <ul className="preview-bullets">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );

  const sortedExperience = experience.length > 0 ? sortByDateRange(experience) : [];
  const experienceBlock = sortedExperience.length > 0 && (
    <div className="tpl-section">
      <span className="tpl-section-label">Experience</span>
      <div className="tpl-experience-list">
        {sortedExperience.map((job, i) => (
          <div className="tpl-experience-item" key={i}>
            <div className="tpl-experience-head">
              <span className="tpl-experience-title">{job.title || "Untitled role"}</span>
              <span className="tpl-experience-dates">
                {formatMonth(job.startDate)} – {job.current ? "Present" : formatMonth(job.endDate)}
              </span>
            </div>
            {job.company && <div className="tpl-experience-company">{job.company}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  const sortedEducation = education.length > 0 ? sortByDateRange(education) : [];
  const educationBlock = sortedEducation.length > 0 && (
    <div className="tpl-section">
      <span className="tpl-section-label">Education</span>
      <div className="tpl-experience-list">
        {sortedEducation.map((school, i) => (
          <div className="tpl-experience-item" key={i}>
            <div className="tpl-experience-head">
              <span className="tpl-experience-title">
                {school.degree}
                {school.degree && school.fieldOfStudy ? ", " : ""}
                {school.fieldOfStudy}
              </span>
              <span className="tpl-experience-dates">
                {formatMonth(school.startDate)} – {school.current ? "Present" : formatMonth(school.endDate)}
              </span>
            </div>
            {school.school && <div className="tpl-experience-company">{school.school}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  const sortedAwards = awards.length > 0 ? sortAwards(awards) : [];
  const awardsBlock = sortedAwards.length > 0 && (
    <div className="tpl-section">
      <span className="tpl-section-label">Awards</span>
      <div className="tpl-experience-list">
        {sortedAwards.map((award, i) => (
          <div className="tpl-experience-item" key={i}>
            <div className="tpl-experience-head">
              <span className="tpl-experience-title">{award.title || "Untitled award"}</span>
              <span className="tpl-experience-dates">{formatMonth(award.date)}</span>
            </div>
            {award.issuer && <div className="tpl-experience-company">{award.issuer}</div>}
            {award.description && <p className="tpl-award-description">{award.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );

  // Fixed reading order for every template, regardless of a template's
  // "flow" (which now only controls section label tone, not order):
  // Summary always leads, Experience and Education follow in that order,
  // then the achievement bullets, with Awards closing out the resume as
  // supplementary, capstone content.
  const orderedSections = (
    <>
      {summaryBlock}
      {experienceBlock}
      {educationBlock}
      {bulletsBlock}
    </>
  );

  // Shown above the resume document itself (never inside .preview-panel) so
  // the person building the resume can see which template is active without
  // that label leaking into the resume's own content — it must not appear
  // when the resume is downloaded, shared, or printed.
  const templateTag = templateName && (
    <div className="preview-template-tag" style={cssVars}>
      Template: {templateName}
    </div>
  );

  if (style.family === "sidebar") {
    const sideFirst = (style.sideAlign ?? "left") === "left";
    const sideContent = (
      <div className="tpl-side">
        {fullName && <p className="tpl-fullname">{fullName}</p>}
        <h2>{heading}</h2>
        <p className="tpl-role">{professionLabel}</p>
        {contactLine}
        {style.badge && (
          <span className="tpl-badge" style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}>
            {style.badge}
          </span>
        )}
      </div>
    );
    const mainContent = (
      <div className="tpl-main">
        {orderedSections}
        {awardsBlock}
      </div>
    );

    return (
      <div className="preview-col">
        {templateTag}
        <div
          className={`preview-panel tpl-sidebar ${sideFirst ? "tpl-side-left" : "tpl-side-right"}`}
          style={cssVars}
        >
          {sideFirst ? (
            <>
              {sideContent}
              {mainContent}
            </>
          ) : (
            <>
              {mainContent}
              {sideContent}
            </>
          )}
        </div>
      </div>
    );
  }

  // executive-banner, centered-serif, cv-academic, and minimal-clean all share
  // the same single-column structure — the CSS classes per family (see
  // global.css) plus bannerAlign are what actually make them look distinct.
  const family = style.family;
  const bannerClass = family === "executive-banner" && style.bannerAlign === "center" ? "tpl-banner-center" : "";
  return (
    <div className="preview-col">
      {templateTag}
      <div className={`preview-panel tpl-${family} ${bannerClass}`} style={cssVars}>
        <div className="tpl-header">
          {fullName && <p className="tpl-fullname">{fullName}</p>}
          <h2>{heading}</h2>
          <p className="tpl-role">{roleLine}</p>
          {contactLine}
        </div>
        {style.badge && <span className="tpl-badge">{style.badge}</span>}
        {orderedSections}
        {awardsBlock}
      </div>
    </div>
  );
}
