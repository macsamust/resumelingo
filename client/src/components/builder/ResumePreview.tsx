import type { CSSProperties } from "react";
import { getTemplateStyle } from "../../config/templateStyles";
import { AchievementEntry, AwardEntry, EducationEntry, WorkExperienceEntry } from "../../types";
import { groupAchievementsByExperience } from "../../utils/starBullet";

interface Props {
  fullName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  /** Data: URL of an uploaded personal photo — only rendered by photo-capable template families (Portrait, Designer, Monochrome, Showcase); other templates ignore it. */
  photoUrl?: string;
  title: string;
  professionLabel: string;
  templateKey?: string;
  templateName?: string;
  summary: string;
  bullets: string[];
  experience?: WorkExperienceEntry[];
  education?: EducationEntry[];
  awards?: AwardEntry[];
  /** Raw achievement entries — only used when combineExperienceFormat is true, to compute each job's nested bullets live (see utils/starBullet.ts). Ignored otherwise, so the default flat-bullets path stays sourced purely from the `bullets` prop. */
  achievements?: AchievementEntry[];
  /** "Combine Work Experience with Achievements" toggle — see types/index.ts Resume.combineExperienceFormat. */
  combineExperienceFormat?: boolean;
}

/**
 * Formats "YYYY-MM" (from an <input type="month">) as "Mon YYYY", e.g.
 * "2021-05" -> "May 2021". Exported so the plain-text export on
 * PublicResumePage.tsx formats dates identically to the on-screen preview.
 */
export function formatMonth(value: string | null | undefined): string {
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
export function sortByDateRange<T extends { current: boolean; startDate: string; endDate: string | null }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    const aKey = (a.current ? null : a.endDate) || a.startDate || "";
    const bKey = (b.current ? null : b.endDate) || b.startDate || "";
    return aKey < bKey ? 1 : aKey > bKey ? -1 : 0;
  });
}

/** Most recent award first. */
export function sortAwards(entries: AwardEntry[]): AwardEntry[] {
  return [...entries].sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : (a.date || "") > (b.date || "") ? -1 : 0));
}

/** Adds https:// to a LinkedIn URL typed without a protocol, so the link always resolves. */
function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** First + last initials (e.g. "Elvira Montanez" -> "EM") for the "photo-banner-sidebar" family's avatar badge — shown when the resume has no uploaded photo. */
function getInitials(name?: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
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
  photoUrl,
  title,
  professionLabel,
  templateKey,
  templateName,
  summary,
  bullets,
  experience = [],
  education = [],
  awards = [],
  achievements = [],
  combineExperienceFormat = false,
}: Props) {
  const style = getTemplateStyle(templateKey ?? "modern");
  const cssVars = {
    "--tpl-accent": style.accent,
    "--tpl-accent-soft": style.accentSoft,
    fontFamily: style.font,
  } as CSSProperties;

  const heading = title || "Untitled Resume";

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

  // In combined-format mode, each achievement's bullet nests under the job
  // it's linked to (computed live from the achievement objects, not the
  // server's saved `bullets` prop — see utils/starBullet.ts for why). The
  // default/flat path below is left byte-for-byte unchanged, still sourced
  // purely from `bullets`, to avoid any regression to existing resumes.
  const grouped = combineExperienceFormat ? groupAchievementsByExperience(achievements, experience) : null;

  const bulletsBlock = combineExperienceFormat
    ? (grouped!.unlinked.length > 0 && (
        <div className="tpl-section">
          <span className="tpl-section-label">{style.bulletsLabel}</span>
          <ul className="preview-bullets">
            {grouped!.unlinked.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      ))
    : bullets.length > 0 && (
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
        {sortedExperience.map((job, i) => {
          const jobBullets = combineExperienceFormat && job.id ? grouped!.byExperienceId[job.id] ?? [] : [];
          return (
            <div className="tpl-experience-item" key={i}>
              <div className="tpl-experience-head">
                <span className="tpl-experience-title">{job.title || "Untitled role"}</span>
                <span className="tpl-experience-dates">
                  {formatMonth(job.startDate)} – {job.current ? "Present" : formatMonth(job.endDate)}
                </span>
              </div>
              {(job.company || job.city || job.state) && (
                <div className="tpl-experience-company">
                  {job.company}
                  {job.company && (job.city || job.state) ? " · " : ""}
                  {[job.city, job.state].filter(Boolean).join(", ")}
                </div>
              )}
              {jobBullets.length > 0 && (
                <ul className="tpl-experience-bullets">
                  {jobBullets.map((b, bi) => (
                    <li key={bi}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
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
      <span className="tpl-section-label">{style.awardsLabel ?? "Awards"}</span>
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

  if (style.family === "timeline-sidebar") {
    // Contact info renders as a labeled, stacked list in the sidebar for
    // this family (rather than the single "email · phone · linkedin" line
    // every other family uses) — closer to a dedicated "Contact" panel.
    const sidebarContact = contactItems.length > 0 && (
      <div className="tpl-section">
        <span className="tpl-section-label">Contact</span>
        <ul className="tpl-timeline-contact-list">
          {contactItems.map((item) => (
            <li key={item.key}>{item.node}</li>
          ))}
        </ul>
      </div>
    );

    return (
      <div className="preview-col">
        {templateTag}
        <div className="preview-panel tpl-timeline-sidebar" style={cssVars}>
          <div className="tpl-timeline-header">
            {fullName && <p className="tpl-fullname">{fullName}</p>}
            <h2>{heading}</h2>
          </div>
          <div className="tpl-timeline-body">
            <div className="tpl-timeline-side">
              {sidebarContact}
              {summaryBlock}
            </div>
            <div className="tpl-timeline-main">
              {bulletsBlock}
              {experienceBlock}
              {educationBlock}
              {awardsBlock}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style.family === "photo-banner-sidebar") {
    const initials = getInitials(fullName);
    // Contact items render in a 2-column grid inside the banner (rather
    // than the single "email · phone · linkedin" line) to match the
    // reference design's layout.
    const contactGrid = contactItems.length > 0 && (
      <div className="tpl-photo-contact-grid">
        {contactItems.map((item) => (
          <span key={item.key}>{item.node}</span>
        ))}
      </div>
    );

    return (
      <div className="preview-col">
        {templateTag}
        <div className="preview-panel tpl-photo-banner-sidebar" style={cssVars}>
          <div className="tpl-photo-header">
            <div className="tpl-photo-header-text">
              {fullName && <p className="tpl-fullname">{fullName}</p>}
              <h2>{heading}</h2>
              {contactGrid}
            </div>
            {photoUrl ? (
              <img src={photoUrl} alt={fullName ? `${fullName}'s photo` : "Profile photo"} className="tpl-photo-img" />
            ) : (
              initials && (
                <div className="tpl-photo-badge" aria-hidden="true">
                  {initials}
                </div>
              )
            )}
          </div>
          <div className="tpl-photo-body">
            <div className="tpl-photo-main">
              {summaryBlock}
              {experienceBlock}
              {educationBlock}
            </div>
            <div className="tpl-photo-side">
              {bulletsBlock}
              {awardsBlock}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style.family === "corner-photo-sidebar") {
    const initials = getInitials(fullName);
    // Contact info renders as a small icon + text list in the sidebar,
    // mirroring the reference design's phone/email/location rows.
    const CONTACT_ICON: Record<string, string> = { email: "✉", phone: "☎", linkedin: "🔗" };
    const contactList = contactItems.length > 0 && (
      <div className="tpl-section">
        <span className="tpl-section-label">Contact</span>
        <ul className="tpl-corner-contact-list">
          {contactItems.map((item) => (
            <li key={item.key}>
              <span className="tpl-corner-contact-icon" aria-hidden="true">
                {CONTACT_ICON[item.key] ?? "•"}
              </span>
              {item.node}
            </li>
          ))}
        </ul>
      </div>
    );

    return (
      <div className="preview-col">
        {templateTag}
        <div className="preview-panel tpl-corner-photo-sidebar" style={cssVars}>
          <div className="tpl-corner-header">
            <div className="tpl-corner-photo-wrap">
              <div className="tpl-corner-photo-block" aria-hidden="true" />
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName ? `${fullName}'s photo` : "Profile photo"}
                  className="tpl-corner-photo-img"
                />
              ) : (
                initials && (
                  <div className="tpl-corner-photo-badge" aria-hidden="true">
                    {initials}
                  </div>
                )
              )}
            </div>
            <div className="tpl-corner-header-text">
              {fullName && <p className="tpl-fullname">{fullName}</p>}
              <h2>{heading}</h2>
            </div>
          </div>
          <div className="tpl-corner-body">
            <div className="tpl-corner-side">
              {summaryBlock}
              {contactList}
              {bulletsBlock}
            </div>
            <div className="tpl-corner-main">
              {experienceBlock}
              {educationBlock}
              {awardsBlock}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style.family === "photo-sidebar-underline") {
    const initials = getInitials(fullName);
    const sidebarContact = contactItems.length > 0 && (
      <div className="tpl-section">
        <span className="tpl-section-label">Contact</span>
        <ul className="tpl-mono-contact-list">
          {contactItems.map((item) => (
            <li key={item.key}>{item.node}</li>
          ))}
        </ul>
      </div>
    );

    return (
      <div className="preview-col">
        {templateTag}
        <div className="preview-panel tpl-photo-sidebar-underline" style={cssVars}>
          <div className="tpl-mono-header">
            <div className="tpl-mono-photo-wrap">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName ? `${fullName}'s photo` : "Profile photo"}
                  className="tpl-mono-photo-img"
                />
              ) : (
                initials && (
                  <div className="tpl-mono-photo-badge" aria-hidden="true">
                    {initials}
                  </div>
                )
              )}
            </div>
            <div className="tpl-mono-header-text">
              {fullName && <p className="tpl-fullname">{fullName}</p>}
              <h2>{heading}</h2>
            </div>
          </div>
          <div className="tpl-mono-body">
            <div className="tpl-mono-side">
              {sidebarContact}
              {educationBlock}
              {bulletsBlock}
            </div>
            <div className="tpl-mono-main">
              {summaryBlock}
              {experienceBlock}
              {awardsBlock}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style.family === "pill-grid-cards") {
    const initials = getInitials(fullName);
    const contactCard = contactItems.length > 0 && (
      <div className="tpl-pill-card tpl-pill-contact">
        <div className="tpl-section">
          <span className="tpl-section-label">Contact</span>
          <ul className="tpl-pill-contact-list">
            {contactItems.map((item) => (
              <li key={item.key}>{item.node}</li>
            ))}
          </ul>
        </div>
      </div>
    );
    const skillsCard = bulletsBlock && <div className="tpl-pill-card tpl-pill-skills">{bulletsBlock}</div>;
    const experienceCard = experienceBlock && <div className="tpl-pill-card tpl-pill-experience">{experienceBlock}</div>;
    const educationCard = educationBlock && <div className="tpl-pill-card tpl-pill-education">{educationBlock}</div>;
    const awardsCard = awardsBlock && <div className="tpl-pill-card tpl-pill-awards">{awardsBlock}</div>;

    return (
      <div className="preview-col">
        {templateTag}
        <div className="preview-panel tpl-pill-grid-cards" style={cssVars}>
          <div className="tpl-pill-header">
            <div className="tpl-pill-photo-wrap">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName ? `${fullName}'s photo` : "Profile photo"}
                  className="tpl-pill-photo-img"
                />
              ) : (
                initials && (
                  <div className="tpl-pill-photo-badge" aria-hidden="true">
                    {initials}
                  </div>
                )
              )}
            </div>
            <div className="tpl-pill-header-text">
              {fullName && <p className="tpl-fullname">{fullName}</p>}
              <h2>{heading}</h2>
              {summary && <p className="tpl-pill-intro">{summary}</p>}
            </div>
          </div>
          <div className="tpl-pill-grid">
            <div className="tpl-pill-col">
              {contactCard}
              {skillsCard}
              {awardsCard}
            </div>
            <div className="tpl-pill-col">
              {experienceCard}
              {educationCard}
            </div>
          </div>
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
          {contactLine}
        </div>
        {style.badge && <span className="tpl-badge">{style.badge}</span>}
        {orderedSections}
        {awardsBlock}
      </div>
    </div>
  );
}
