import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, catalogApi } from "../api";
import { PublicResume, ReferenceEntry } from "../types";
import { buildContactLine, filterAnswerEntries, formatMonth, ResumePreview, sortAwards, sortByDateRange } from "../components/builder/ResumePreview";
import { CLEARANCE_OPTIONS, recruiterOptionLabel, REMOTE_PREFERENCE_OPTIONS, WORK_AUTHORIZATION_OPTIONS } from "../config/recruiterOptions";
import { groupAchievementsByExperience } from "../utils/starBullet";
import { PublicResumeSkeleton } from "../components/common/PublicResumeSkeleton";
import { getTemplateStyle } from "../config/templateStyles";
import { downloadResumePdf } from "../utils/pdfExport";

/**
 * Turns a camelCase profession-question key (e.g. "cloudPlatforms",
 * "yearsExperience") into a properly capitalized label ("Cloud Platforms",
 * "Years Experience") for the Additional Details heading — used on screen,
 * in print, and in the text/PDF exports so all four stay consistent.
 *
 * ANSWER_LABEL_OVERRIDES handles keys whose generic camelCase-split label
 * doesn't match what's actually configured in professions.ts (worker's and
 * server's copies) — the builder's DynamicQuestionForm reads that label
 * directly, but this function only ever sees the raw answer key, not the
 * profession's question config, so a mismatch has to be corrected by hand
 * here. Currently just "languages": professions.ts labels the Software
 * Engineer question "Coding Languages" (to distinguish it from the resume's
 * separate, spoken-language "Languages" section — see LanguageEntry), but
 * the generic split would otherwise produce "Languages" here.
 */
const ANSWER_LABEL_OVERRIDES: Record<string, string> = {
  languages: "Coding Languages",
};

function formatAnswerLabel(key: string): string {
  if (ANSWER_LABEL_OVERRIDES[key]) return ANSWER_LABEL_OVERRIDES[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Plain-text rendering of a resume — same content and order as the on-screen preview, for the "Download as text" export. */
function resumeToPlainText(resume: PublicResume): string {
  const lines: string[] = [];

  if (resume.fullName) lines.push(resume.fullName);
  lines.push(resume.title || "Untitled Resume");
  const contactLine = [resume.contactEmail, resume.contactPhone, resume.contactLinkedIn].filter(Boolean).join("  |  ");
  if (contactLine) lines.push(contactLine);
  lines.push("");

  if (resume.generatedSummary) {
    lines.push("SUMMARY");
    lines.push(resume.generatedSummary);
    lines.push("");
  }

  // Combined-format mode nests each achievement's bullet under the job it's
  // linked to, matching the on-screen preview (see ResumePreview.tsx). The
  // default path below is unchanged: a flat bulletsLabel-headed section.
  const bulletsLabel = getTemplateStyle(resume.templateKey).bulletsLabel.toUpperCase();
  const grouped = resume.combineExperienceFormat
    ? groupAchievementsByExperience(resume.achievements ?? [], resume.experience ?? [])
    : null;

  const experience = resume.experience?.length ? sortByDateRange(resume.experience) : [];
  if (experience.length > 0) {
    lines.push("EXPERIENCE");
    for (const job of experience) {
      const dates = `${formatMonth(job.startDate)} – ${job.current ? "Present" : formatMonth(job.endDate)}`;
      const location = [job.city, job.state].filter(Boolean).join(", ");
      lines.push(
        `${job.title || "Untitled role"}${job.company ? `, ${job.company}` : ""}${location ? `, ${location}` : ""} (${dates})`
      );
      if (grouped && job.id) {
        for (const bullet of grouped.byExperienceId[job.id] ?? []) lines.push(`  - ${bullet}`);
      }
    }
    lines.push("");
  }

  const education = resume.education?.length ? sortByDateRange(resume.education) : [];
  if (education.length > 0) {
    lines.push("EDUCATION");
    for (const school of education) {
      const degreeLine = [school.degree, school.fieldOfStudy].filter(Boolean).join(", ");
      const dates = `${formatMonth(school.startDate)} – ${school.current ? "Present" : formatMonth(school.endDate)}`;
      lines.push(`${degreeLine}${school.school ? `, ${school.school}` : ""} (${dates})`);
    }
    lines.push("");
  }

  const highlightBullets = grouped ? grouped.unlinked : resume.generatedBullets ?? [];
  if (highlightBullets.length > 0) {
    lines.push(bulletsLabel);
    for (const bullet of highlightBullets) lines.push(`- ${bullet}`);
    lines.push("");
  }

  // Premium-templates-only in the on-screen preview (see ResumePreview.tsx's
  // showSkillsAndTools), but included here regardless of template — a text
  // export shouldn't silently drop data the resume has.
  const skills = resume.skillsAndTools?.filter((s) => s.category === "skill") ?? [];
  const tools = resume.skillsAndTools?.filter((s) => s.category === "tool") ?? [];
  if (skills.length > 0 || tools.length > 0) {
    lines.push("SKILLS & TOOLS");
    if (skills.length > 0) lines.push(`Skills: ${skills.map((s) => s.label).join(", ")}`);
    if (tools.length > 0) lines.push(`Tools: ${tools.map((s) => s.label).join(", ")}`);
    lines.push("");
  }

  // Same "blank row was never meant to be published" filter as Languages
  // below — a title-less award only exists from an unfinished "+ Add award"
  // click or an edit that never actually saved.
  const namedAwards = (resume.awards ?? []).filter((a) => a.title.trim());
  const awards = namedAwards.length > 0 ? sortAwards(namedAwards) : [];
  if (awards.length > 0) {
    lines.push("AWARDS");
    for (const award of awards) {
      lines.push(`${award.title}${award.issuer ? `, ${award.issuer}` : ""} (${formatMonth(award.date)})`);
      if (award.description) lines.push(award.description);
    }
    lines.push("");
  }

  // Filters out a blank-language row rather than falling back to "Untitled
  // language" — a row like this only exists from clicking "+ Add language"
  // and not filling it in (or an in-progress edit that never got saved), not
  // from anything the subscriber actually meant to publish.
  const languages = (resume.languages ?? []).filter((l) => l.language.trim());
  if (languages.length > 0) {
    lines.push("LANGUAGES");
    for (const lang of languages) {
      lines.push(`${lang.language}${lang.proficiency ? `, ${lang.proficiency}` : ""}`);
    }
    lines.push("");
  }

  // Profession-specific Q&A (e.g. Languages, Frameworks, Cloud Platforms,
  // Certifications, Years Experience for a Software Engineer resume) — the
  // same "Additional Details" content shown below the resume on screen and
  // in print, included here too so the text export isn't missing it.
  const answerEntries = filterAnswerEntries(resume.answers, resume.skillsAndTools);
  if (answerEntries.length > 0) {
    lines.push("ADDITIONAL DETAILS");
    for (const [key, value] of answerEntries) {
      lines.push(`${formatAnswerLabel(key)}: ${value}`);
    }
    lines.push("");
  }

  // Already gated server-side — Premium subscribers only. Sourced from
  // whichever of the two mutually-exclusive spots actually has the data:
  // the standalone section (resume.references) normally, or the Recruiter
  // Mode card (resume.recruiterCard.references) when the owner checked
  // "only in Recruiter Mode printout" — see server's
  // Resume.publicReferences/recruiterCard.
  const referencesForExport = resume.references?.length ? resume.references : resume.recruiterCard?.references ?? [];
  if (referencesForExport.length > 0) {
    lines.push("REFERENCES");
    for (const ref of referencesForExport) {
      const roleLine = [ref.companyPosition, ref.company].filter(Boolean).join(", ");
      lines.push(`${ref.name || "Untitled reference"}${roleLine ? `, ${roleLine}` : ""}`);
      const contactLine = [ref.email, ref.phone].filter(Boolean).join("  |  ");
      if (contactLine) lines.push(contactLine);
      const detailLine = [ref.affiliation, formatReferenceDateRange(ref)].filter(Boolean).join(", ");
      if (detailLine) lines.push(detailLine);
      lines.push("");
    }
  }

  return lines.join("\n").trim() + "\n";
}

/**
 * Shared card grid for a references list — used both for the resume's own
 * standalone "References" section and, when the owner checked "only in
 * Recruiter Mode printout", inside the Candidate Summary card instead. The
 * two are mutually exclusive (see server's Resume.publicReferences/
 * recruiterCard), so this only ever renders in one place per resume.
 */
/** "Start – End", "Start" (no end given), "End" (no start given, e.g. an
 *  ongoing relationship with no fixed start on record), or "" when neither
 *  is set — mirrors the Work Experience/Education "Start – Present" pattern
 *  minus the "current" concept, since a reference's date range doesn't have
 *  an open-ended "Present" state. */
function formatReferenceDateRange(ref: ReferenceEntry): string {
  const start = ref.dateObservedStart ? formatMonth(ref.dateObservedStart) : "";
  const end = ref.dateObservedEnd ? formatMonth(ref.dateObservedEnd) : "";
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

function ReferencesGrid({ references }: { references: ReferenceEntry[] }) {
  return (
    <div className="references-grid">
      {references.map((ref, i) => (
        <div className="reference-card" key={i}>
          <div className="reference-name">{ref.name || "Untitled reference"}</div>
          {(ref.companyPosition || ref.company) && (
            <div className="reference-role">{[ref.companyPosition, ref.company].filter(Boolean).join(", ")}</div>
          )}
          {ref.affiliation && <div className="reference-affiliation">{ref.affiliation}</div>}
          {(ref.email || ref.phone) && (
            <div className="reference-contact">{[ref.email, ref.phone].filter(Boolean).join("  ·  ")}</div>
          )}
          {(ref.dateObservedStart || ref.dateObservedEnd) && (
            <div className="reference-date">{formatReferenceDateRange(ref)}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function downloadTextFile(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function PublicResumePage() {
  const { slug } = useParams<{ slug: string }>();
  const [resume, setResume] = useState<PublicResume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  const load = (pwd?: string) => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    catalogApi
      .getPublicResume(slug, pwd)
      .then((res) => {
        setResume(res.resume);
        setPasswordRequired(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403 && err.reason === "private") {
          // Private/owner-only resumes have no password to enter — asking for
          // one would send the visitor into a form they can never satisfy.
          setError("This resume is private. Only the owner can view it. Sign in as the owner to access it.");
        } else if (err instanceof ApiError && err.status === 403 && err.reason === "expired") {
          // Expired password-protected links are deactivated outright — no
          // password prompt, since no password would work at this point.
          setError("This resume link has expired and is no longer accessible.");
        } else if (err instanceof ApiError && err.status === 403 && err.reason === "inactive") {
          // Deliberately paused by the owner (see the Deactivate toggle on
          // My Resumes) — no password would work here either, so no prompt.
          setError("This resume link has been deactivated by its owner.");
        } else if (err instanceof ApiError && err.status === 403) {
          setPasswordRequired(true);
        } else if (err instanceof ApiError && err.status === 404) {
          setError("This resume link doesn't exist or was removed.");
        } else {
          setError("Something went wrong loading this resume.");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmitPassword = (e: FormEvent) => {
    e.preventDefault();
    load(password);
  };

  if (loading) return <PublicResumeSkeleton />;

  if (passwordRequired) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Password required</h1>
          <p className="sub">This resume is password protected.</p>
          <form onSubmit={onSubmitPassword}>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </div>
            <button className="btn btn-primary btn-block" type="submit">
              View resume
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="empty-state">
        <p>{error || "Resume not found."}</p>
        {error?.startsWith("This resume is private") && (
          <Link to="/login" className="btn btn-primary">
            Sign in
          </Link>
        )}
      </div>
    );
  }

  const onDownloadText = () => {
    const filename = `${(resume.title || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "resume"}.txt`;
    downloadTextFile(filename, resumeToPlainText(resume));
  };

  // Needed up here (not just inside the "Additional Details" card's own IIFE
  // below) because ResumePreview's hideFooterContact prop has to know
  // whether there's trailing content to push the footer past before it
  // renders at all — see buildContactLine/hideFooterContact's doc comments
  // in ResumePreview.tsx for the full reasoning.
  const answerEntries = filterAnswerEntries(resume.answers, resume.skillsAndTools);
  const hasTrailingContent = answerEntries.length > 0 || (resume.references?.length ?? 0) > 0;
  const templateStyle = getTemplateStyle(resume.templateKey);

  return (
    <div className="public-resume-page">
      <div className="public-resume-actions">
        <button className="btn btn-primary" onClick={() => downloadResumePdf(resume)} type="button">
          Download PDF
        </button>
        <button className="btn btn-ghost" onClick={() => window.print()} type="button">
          Print / Save as PDF
        </button>
        <button className="btn btn-ghost" onClick={onDownloadText} type="button">
          Download as text (.txt)
        </button>
      </div>
      {resume.recruiterCard && (
        <div className="public-resume-card public-resume-details" style={{ marginBottom: 24 }}>
          <h2 className="public-resume-details-heading">Candidate Summary</h2>
          {resume.recruiterCard.candidateSummary && (
            <p className="recruiter-candidate-summary">{resume.recruiterCard.candidateSummary}</p>
          )}
          <div className="answer-grid">
            {resume.recruiterCard.location && (
              <div>
                <div className="answer-key">Location</div>
                <div className="answer-value">{resume.recruiterCard.location}</div>
              </div>
            )}
            {resume.recruiterCard.availability && (
              <div>
                <div className="answer-key">Availability</div>
                <div className="answer-value">{resume.recruiterCard.availability}</div>
              </div>
            )}
            {resume.recruiterCard.expectedSalary && (
              <div>
                <div className="answer-key">Expected Salary</div>
                <div className="answer-value">{resume.recruiterCard.expectedSalary}</div>
              </div>
            )}
            {resume.recruiterCard.clearance && (
              <div>
                <div className="answer-key">Clearance</div>
                <div className="answer-value">{recruiterOptionLabel(CLEARANCE_OPTIONS, resume.recruiterCard.clearance)}</div>
              </div>
            )}
            {resume.recruiterCard.workAuthorization && (
              <div>
                <div className="answer-key">Work Authorization</div>
                <div className="answer-value">
                  {recruiterOptionLabel(WORK_AUTHORIZATION_OPTIONS, resume.recruiterCard.workAuthorization)}
                </div>
              </div>
            )}
            {resume.recruiterCard.remotePreference && (
              <div>
                <div className="answer-key">Remote Preference</div>
                <div className="answer-value">
                  {recruiterOptionLabel(REMOTE_PREFERENCE_OPTIONS, resume.recruiterCard.remotePreference)}
                </div>
              </div>
            )}
          </div>
          {resume.recruiterCard.skills.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="answer-key" style={{ marginBottom: 10 }}>
                Skills
              </div>
              <div className="recruiter-skill-chips">
                {resume.recruiterCard.skills.map((s) => (
                  <span key={s} className="recruiter-skill-chip">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {resume.recruiterCard.references.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="answer-key" style={{ marginBottom: 10 }}>
                References
              </div>
              <ReferencesGrid references={resume.recruiterCard.references} />
            </div>
          )}
        </div>
      )}
      <ResumePreview
        fullName={resume.fullName}
        contactEmail={resume.contactEmail}
        contactPhone={resume.contactPhone}
        contactLinkedIn={resume.contactLinkedIn}
        photoUrl={resume.photoUrl}
        title={resume.title}
        professionLabel={resume.professionLabel}
        templateKey={resume.templateKey}
        summary={resume.generatedSummary}
        bullets={resume.generatedBullets}
        experience={resume.experience}
        education={resume.education}
        awards={resume.awards}
        achievements={resume.achievements}
        combineExperienceFormat={resume.combineExperienceFormat}
        skillsAndTools={resume.skillsAndTools}
        showSkillsAndTools={resume.template?.category === "premium"}
        languages={resume.languages}
        hideFooterContact={hasTrailingContent}
        securityClearance={resume.answers.clearanceLevel}
      />
      {(() => {
        if (answerEntries.length === 0) return null;
        return (
          <div className={`public-resume-card public-resume-details tpl-key-${resume.templateKey ?? "modern"}`}>
            <h2 className="public-resume-details-heading">Additional Details</h2>
            <div className="answer-grid">
              {answerEntries.map(([key, value]) => (
                <div key={key}>
                  <div className="answer-key">{formatAnswerLabel(key)}</div>
                  <div className="answer-value">{value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {resume.references?.length > 0 && (
        <div className={`public-resume-card public-resume-details tpl-key-${resume.templateKey ?? "modern"}`}>
          <h2 className="public-resume-details-heading">References</h2>
          <ReferencesGrid references={resume.references} />
        </div>
      )}
      {templateStyle.contactInFooter && hasTrailingContent && (
        <div className={`tpl-key-${resume.templateKey ?? "modern"}`}>
          <div className="tpl-footer-contact">
            {buildContactLine({
              contactEmail: resume.contactEmail,
              contactPhone: resume.contactPhone,
              contactLinkedIn: resume.contactLinkedIn,
              separator: templateStyle.contactSeparator,
            })}
          </div>
        </div>
      )}
    </div>
  );
}
