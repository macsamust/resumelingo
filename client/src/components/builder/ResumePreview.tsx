import type { CSSProperties } from "react";
import { getTemplateStyle } from "../../config/templateStyles";
import { AchievementEntry, AwardEntry, EducationEntry, LanguageEntry, SkillOrTool, WorkExperienceEntry } from "../../types";
import { groupAchievementsByExperience } from "../../utils/starBullet";
import { PROFICIENCY_MAX_LEVEL, proficiencyLevel } from "../../utils/languageProficiency";

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
  /** "Skills & Tools" section content — see showSkillsAndTools below for whether it actually renders. */
  skillsAndTools?: SkillOrTool[];
  /** Whether to render the Skills & Tools section — true for every Premium-tier template, computed by the caller (which knows the template's category; this component only knows its layout family). False/omitted hides it even if skillsAndTools has entries, so a resume that's since moved off a Premium template doesn't keep showing a Premium-only section. */
  showSkillsAndTools?: boolean;
  /** Optional "Languages" section — not tier-gated, unlike Skills & Tools. Omitted entirely (no empty section) when empty. */
  languages?: LanguageEntry[];
  /**
   * For templates with contactInFooter set (see TemplateStyle) only: skips
   * this component's own footer-contact block. Used by PublicResumePage
   * when the resume also has trailing "Additional Details"/"References"
   * cards (its own siblings, rendered after this component, outside
   * .preview-panel) — it renders an equivalent footer itself, after that
   * trailing content, using the exported buildContactLine helper, instead
   * of leaving this component's copy sitting above it mid-page. No effect
   * for templates without contactInFooter, or when there's no trailing
   * content to push the footer past.
   */
  hideFooterContact?: boolean;
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

/**
 * Profession-question keys whose content duplicates the "Tools" half of the
 * Skills & Tools picker (see SkillsAndToolsEditor.tsx and skill_suggestions'
 * "tool" category) — Project Manager/Marketing/Business Professional's
 * "Tools Used", Sales's "CRM Tools", Nurse's "Electronic Medical Record
 * Systems", Teacher's "Classroom Technology", Construction's "Equipment
 * Operated", Software Engineer's "Cloud Platforms". See config/professions.ts.
 */
export const TOOL_DUPLICATE_ANSWER_KEYS = new Set([
  "toolsUsed",
  "crmTools",
  "emrSystems",
  "classroomTechnology",
  "equipmentOperated",
  "cloudPlatforms",
]);

/**
 * Filters a resume's raw answers down to what "Additional Details" should
 * show: blank answers dropped (existing behavior), plus — when the Skills &
 * Tools section actually has at least one tool chip selected — any answer in
 * TOOL_DUPLICATE_ANSWER_KEYS, so a Premium-template resume doesn't show the
 * same tools twice (once as a "Tools Used"-style answer, once as Skills &
 * Tools chips). Left alone on non-Premium templates and on Premium resumes
 * that haven't picked any tool chips yet, since Skills & Tools isn't showing
 * anything for these keys to duplicate in either case. Shared by
 * PublicResumePage's on-screen card, its plain-text export, and
 * pdfExport.ts's PDF export.
 */
export function filterAnswerEntries(answers: Record<string, string>, skillsAndTools: SkillOrTool[] | undefined): [string, string][] {
  const hasToolChips = (skillsAndTools ?? []).some((s) => s.category === "tool");
  return Object.entries(answers).filter(([key, value]) => {
    if (!value || !value.trim()) return false;
    if (hasToolChips && TOOL_DUPLICATE_ANSWER_KEYS.has(key)) return false;
    return true;
  });
}

/** Adds https:// to a LinkedIn URL typed without a protocol, so the link always resolves. */
function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Builds the header contact line (email/phone/LinkedIn, joined by
 * separator) — extracted out of ResumePreview's body so PublicResumePage
 * can render an equivalent footer contact line of its own, outside
 * .preview-panel entirely, for templates with contactInFooter set (see
 * TemplateStyle) whose resume also has trailing "Additional Details" or
 * "References" cards: those need the footer to land after that trailing
 * content instead of at the end of the resume panel, which ResumePreview
 * itself has no visibility into (that content is PublicResumePage's own
 * sibling cards, not part of what ResumePreview renders) — see this
 * component's hideFooterContact prop.
 */
export function buildContactLine(input: {
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  separator?: string;
}): JSX.Element | false {
  const { contactEmail, contactPhone, contactLinkedIn, separator = " · " } = input;
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
  return (
    contactItems.length > 0 && (
      <p className="tpl-contact">
        {contactItems.map((item, i) => (
          <span key={item.key}>
            {i > 0 && <span className="tpl-contact-sep">{separator}</span>}
            {item.node}
          </span>
        ))}
      </p>
    )
  );
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
  skillsAndTools = [],
  showSkillsAndTools = false,
  languages = [],
  hideFooterContact = false,
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
  // contactItems itself (the raw array) is still needed here, separately
  // from contactLine below — the sidebar/photo-banner-sidebar/etc. family
  // branches further down build their own contact layouts directly from
  // this array (icon list, grid, etc.) rather than the single joined
  // paragraph buildContactLine produces.
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
  // The single-column family's joined "email · phone · linkedin" paragraph
  // — see buildContactLine's doc comment for why it's a shared, exported
  // helper rather than computed inline (PublicResumePage reuses it for the
  // footer-contact card).
  const contactLine = buildContactLine({ contactEmail, contactPhone, contactLinkedIn, separator: style.contactSeparator });

  // A section label's flanking rule (see the "ats-optimized" rules in
  // global.css) is two real spans, not ::before/::after pseudo-elements —
  // hidden by default (display: none) for every other template, shown only
  // for ats-optimized. Real DOM elements instead of pseudo-elements so the
  // flex-line trick can't silently fail to inherit/cascade the way a
  // pseudo-element occasionally can depending on browser/build quirks; also
  // just easier to inspect/debug than a generated box. Used by every
  // section this family renders (Summary, Experience, Education,
  // Achievements, Skills & Tools, Awards, Languages) so the rule is
  // guaranteed consistent across all of them.
  const sectionLabel = (text: string) => (
    <span className="tpl-section-label">
      <span className="tpl-section-rule" aria-hidden="true" />
      <span className="tpl-section-label-text">{text}</span>
      <span className="tpl-section-rule" aria-hidden="true" />
    </span>
  );

  const summaryBlock = (
    <div className="tpl-section">
      {sectionLabel(style.summaryLabel)}
      {summary ? (
        <p className="preview-summary">{summary}</p>
      ) : (
        <p className="preview-summary" style={{ color: "var(--muted)", fontStyle: "italic" }}>
          Your AI generated summary will appear here once you save.
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
          {sectionLabel(style.bulletsLabel)}
          <ul className="preview-bullets">
            {grouped!.unlinked.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      ))
    : bullets.length > 0 && (
        <div className="tpl-section">
          {sectionLabel(style.bulletsLabel)}
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
      {sectionLabel(style.experienceLabel ?? "Experience")}
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
      {sectionLabel(style.educationLabel ?? "Education")}
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

  // Same "blank row was never meant to be published" filter as Languages
  // above — a title-less award only exists from an unfinished "+ Add award"
  // click or an edit that never actually saved.
  const namedAwards = awards.filter((a) => a.title.trim());
  const sortedAwards = namedAwards.length > 0 ? sortAwards(namedAwards) : [];
  const awardsBlock = sortedAwards.length > 0 && (
    <div className="tpl-section">
      {sectionLabel(style.awardsLabel ?? "Awards")}
      <div className="tpl-experience-list">
        {sortedAwards.map((award, i) => (
          <div className="tpl-experience-item" key={i}>
            <div className="tpl-experience-head">
              <span className="tpl-experience-title">{award.title}</span>
              <span className="tpl-experience-dates">{formatMonth(award.date)}</span>
            </div>
            {award.issuer && <div className="tpl-experience-company">{award.issuer}</div>}
            {award.description && <p className="tpl-award-description">{award.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );

  // Premium-only (see Props.showSkillsAndTools) — rendered in whichever spot
  // fits each layout family (see each family's branch below). Skills and
  // tools render as two separately-labeled groups with a rule between them
  // (the "delineator") rather than one merged list, so the two kinds of
  // keyword stay visually distinct even though they're picked from the same
  // section in the builder.
  const skills = skillsAndTools.filter((s) => s.category === "skill");
  const tools = skillsAndTools.filter((s) => s.category === "tool");
  const skillsSeparator = style.skillsSeparator ?? ", ";
  const skillsAndToolsBlock = showSkillsAndTools && skillsAndTools.length > 0 && (
    <div className="tpl-section">
      {sectionLabel("Skills & Tools")}
      {skills.length > 0 && (
        <div className="tpl-skills-tools-group">
          <span className="tpl-skills-tools-group-label">{style.skillsLabel ?? "Skills"}</span>
          <p className="tpl-skills-tools-list">{skills.map((s) => s.label).join(skillsSeparator)}</p>
        </div>
      )}
      {skills.length > 0 && tools.length > 0 && <div className="tpl-skills-tools-divider" />}
      {tools.length > 0 && (
        <div className="tpl-skills-tools-group">
          <span className="tpl-skills-tools-group-label">{style.toolsLabel ?? "Tools"}</span>
          <p className="tpl-skills-tools-list">{tools.map((s) => s.label).join(skillsSeparator)}</p>
        </div>
      )}
    </div>
  );

  // A blank-language row (added via "+ Add language" but never filled in,
  // or an in-progress edit that never actually saved) is filtered out
  // rather than shown as "Untitled language" — it was never meant to be
  // published. Optional section overall, not tier-gated (unlike Skills &
  // Tools) — omitted entirely when there's nothing left, same "no empty
  // section" rule every other block here follows.
  const namedLanguages = languages.filter((l) => l.language.trim());
  const languagesBlock = namedLanguages.length > 0 && (
    <div className="tpl-section">
      {sectionLabel("Languages")}
      <ul
        className="tpl-languages-list"
        style={style.languagesAccent ? ({ "--languages-accent": style.languagesAccent } as CSSProperties) : undefined}
      >
        {namedLanguages.map((l, i) => (
          <li key={i}>
            <span className="tpl-languages-name">{l.language}</span>
            {l.proficiency && <span className="tpl-languages-proficiency">, {l.proficiency}</span>}
            {style.languageProficiencyMeter && l.proficiency && (
              <span className="tpl-languages-meter" aria-hidden="true">
                {Array.from({ length: PROFICIENCY_MAX_LEVEL }, (_, dotIndex) => (
                  <span
                    key={dotIndex}
                    className={`tpl-languages-dot ${dotIndex < proficiencyLevel(l.proficiency) ? "is-filled" : ""}`}
                  />
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  // Fixed reading order for every template, regardless of a template's
  // "flow" (which now only controls section label tone, not order):
  // Summary always leads, Experience and Education follow in that order,
  // then the achievement bullets, with Awards closing out the resume as
  // supplementary, capstone content. Education is left out here (rendered
  // separately, later, between Skills & Tools and Languages) only for
  // templates with educationAfterSkills set — currently just "ATS
  // Optimized," at the person's request — every other template keeps this
  // standard order. Skills & Tools is similarly pulled forward, right after
  // Summary, only for templates with skillsAfterSummary set (currently just
  // "Boardroom") — it otherwise renders near the end, in the tail below.
  const orderedSections = (
    <>
      {summaryBlock}
      {style.skillsAfterSummary && skillsAndToolsBlock}
      {experienceBlock}
      {!style.educationAfterSkills && educationBlock}
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
    // Education moves into the narrower side column (with Highlights kept
    // in the wider main column below) so every two-column template follows
    // the same rule: Highlights/Achievements live in the larger column,
    // Education in the smaller one.
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
        {educationBlock}
      </div>
    );
    const mainContent = (
      <div className="tpl-main">
        {summaryBlock}
        {experienceBlock}
        {bulletsBlock}
        {skillsAndToolsBlock}
        {awardsBlock}
        {languagesBlock}
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
              {educationBlock}
            </div>
            <div className="tpl-timeline-main">
              {bulletsBlock}
              {experienceBlock}
              {awardsBlock}
              {languagesBlock}
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
              {bulletsBlock}
            </div>
            <div className="tpl-photo-side">
              {educationBlock}
              {skillsAndToolsBlock}
              {awardsBlock}
              {languagesBlock}
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
              {educationBlock}
              {skillsAndToolsBlock}
              {languagesBlock}
            </div>
            <div className="tpl-corner-main">
              {experienceBlock}
              {bulletsBlock}
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
          <div
            className={`tpl-mono-header ${
              style.headerVariant === "banner"
                ? "tpl-mono-header-banner"
                : style.headerVariant === "banner-center"
                  ? "tpl-mono-header-banner-center"
                  : ""
            }`}
          >
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
              {skillsAndToolsBlock}
              {languagesBlock}
            </div>
            <div className="tpl-mono-main">
              {summaryBlock}
              {experienceBlock}
              {bulletsBlock}
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
    const skillsAndToolsCard = skillsAndToolsBlock && (
      <div className="tpl-pill-card tpl-pill-skills-tools">{skillsAndToolsBlock}</div>
    );
    const experienceCard = experienceBlock && <div className="tpl-pill-card tpl-pill-experience">{experienceBlock}</div>;
    const educationCard = educationBlock && <div className="tpl-pill-card tpl-pill-education">{educationBlock}</div>;
    const awardsCard = awardsBlock && <div className="tpl-pill-card tpl-pill-awards">{awardsBlock}</div>;
    const languagesCard = languagesBlock && <div className="tpl-pill-card tpl-pill-languages">{languagesBlock}</div>;

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
              {skillsAndToolsCard}
              {educationCard}
              {awardsCard}
              {languagesCard}
            </div>
            <div className="tpl-pill-col">
              {experienceCard}
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
  const accentNameClass = style.accentName ? "tpl-accent-name" : "";
  const cornerAccentClass = style.cornerAccent ? "tpl-corner-accent" : "";
  // Splits off just the first word of the name to color it via
  // firstNameAccent (Government) — falls back to the plain string
  // untouched for every template that doesn't set it, and for a
  // single-word name (nothing to split off).
  let fullNameNode: string | JSX.Element | undefined = fullName;
  if (style.firstNameAccent && fullName) {
    const spaceIndex = fullName.indexOf(" ");
    if (spaceIndex !== -1) {
      fullNameNode = (
        <>
          <span style={{ color: style.firstNameAccent }}>{fullName.slice(0, spaceIndex)}</span>
          {fullName.slice(spaceIndex)}
        </>
      );
    }
  }
  return (
    <div className="preview-col">
      {templateTag}
      <div
        className={`preview-panel tpl-${family} tpl-key-${templateKey ?? "modern"} ${bannerClass} ${accentNameClass} ${cornerAccentClass}`}
        style={cssVars}
      >
        <div className="tpl-header">
          {fullName && <p className="tpl-fullname">{fullNameNode}</p>}
          <h2>{heading}</h2>
          {!style.contactInFooter && contactLine}
        </div>
        {style.badge && <span className="tpl-badge">{style.badge}</span>}
        {orderedSections}
        {!style.skillsAfterSummary && skillsAndToolsBlock}
        {awardsBlock}
        {style.educationAfterSkills && educationBlock}
        {languagesBlock}
        {style.contactInFooter && !hideFooterContact && contactLine && <div className="tpl-footer-contact">{contactLine}</div>}
      </div>
    </div>
  );
}
