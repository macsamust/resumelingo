import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, catalogApi } from "../api";
import { PublicResume } from "../types";
import { formatMonth, ResumePreview, sortAwards, sortByDateRange } from "../components/builder/ResumePreview";

/**
 * Turns a camelCase profession-question key (e.g. "cloudPlatforms",
 * "language", "yearsExperience") into a properly capitalized label
 * ("Cloud Platforms", "Language", "Years Experience") for the Additional
 * Details heading — used on screen, in print, and in the text export so
 * all three stay consistent.
 */
function formatAnswerLabel(key: string): string {
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

  const experience = resume.experience?.length ? sortByDateRange(resume.experience) : [];
  if (experience.length > 0) {
    lines.push("EXPERIENCE");
    for (const job of experience) {
      const dates = `${formatMonth(job.startDate)} – ${job.current ? "Present" : formatMonth(job.endDate)}`;
      const location = [job.city, job.state].filter(Boolean).join(", ");
      lines.push(
        `${job.title || "Untitled role"}${job.company ? `, ${job.company}` : ""}${location ? `, ${location}` : ""} (${dates})`
      );
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

  if (resume.generatedBullets?.length > 0) {
    lines.push("HIGHLIGHTS");
    for (const bullet of resume.generatedBullets) lines.push(`- ${bullet}`);
    lines.push("");
  }

  const awards = resume.awards?.length ? sortAwards(resume.awards) : [];
  if (awards.length > 0) {
    lines.push("AWARDS");
    for (const award of awards) {
      lines.push(`${award.title || "Untitled award"}${award.issuer ? `, ${award.issuer}` : ""} (${formatMonth(award.date)})`);
      if (award.description) lines.push(award.description);
    }
    lines.push("");
  }

  // Profession-specific Q&A (e.g. Languages, Frameworks, Cloud Platforms,
  // Certifications, Years Experience for a Software Engineer resume) — the
  // same "Additional Details" content shown below the resume on screen and
  // in print, included here too so the text export isn't missing it.
  const answerEntries = Object.entries(resume.answers).filter(([, v]) => v && v.trim());
  if (answerEntries.length > 0) {
    lines.push("ADDITIONAL DETAILS");
    for (const [key, value] of answerEntries) {
      lines.push(`${formatAnswerLabel(key)}: ${value}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

/**
 * Prints just the cover letter panel, leaving the main "Print / Save as
 * PDF" button's "print everything" behavior untouched. Toggles a class on
 * <body> directly (rather than React state) so it's guaranteed to be in
 * the DOM synchronously before window.print() reads it — a setState here
 * wouldn't necessarily have re-rendered/painted yet by the time print()
 * runs, since React batches updates outside this handler's own tick.
 * Cleaned up via the 'afterprint' event, which fires once the print
 * dialog/preview closes (both on successful print and on cancel).
 */
function printOnly(className: string): void {
  document.body.classList.add(className);
  const cleanup = () => {
    document.body.classList.remove(className);
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
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

type ResumeTab = "resume" | "cover-letter";

export function PublicResumePage() {
  const { slug } = useParams<{ slug: string }>();
  const [resume, setResume] = useState<PublicResume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ResumeTab>("resume");

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
          setError("This Websume is private. Only the owner can view it — sign in as the owner to access it.");
        } else if (err instanceof ApiError && err.status === 403 && err.reason === "expired") {
          // Expired password-protected links are deactivated outright — no
          // password prompt, since no password would work at this point.
          setError("This resume link has expired and is no longer accessible.");
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

  if (loading) return <div className="spinner-page">Loading resume…</div>;

  if (passwordRequired) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Password required</h1>
          <p className="sub">This Websume is password-protected.</p>
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
        {error?.startsWith("This Websume is private") && (
          <Link to="/login" className="btn btn-primary">
            Sign in
          </Link>
        )}
      </div>
    );
  }

  const baseFilename = (resume.title || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "resume";
  const hasCoverLetter = !!resume.generatedCoverLetter?.trim();

  const onDownloadText = () => {
    downloadTextFile(`${baseFilename}.txt`, resumeToPlainText(resume));
  };

  const onDownloadCoverLetterText = () => {
    downloadTextFile(`${baseFilename}-cover-letter.txt`, resume.generatedCoverLetter.trim() + "\n");
  };

  return (
    <div className="public-resume-page">
      <div className="public-resume-actions">
        <button className="btn btn-primary" onClick={() => window.print()} type="button">
          {hasCoverLetter ? "Print both / Save as PDF" : "Print / Save as PDF"}
        </button>
        <button className="btn btn-ghost" onClick={onDownloadText} type="button">
          Download as text (.txt)
        </button>
        {hasCoverLetter && (
          <>
            <button className="btn btn-ghost" onClick={() => printOnly("print-cover-letter-only")} type="button">
              Print cover letter / Save as PDF
            </button>
            <button className="btn btn-ghost" onClick={onDownloadCoverLetterText} type="button">
              Download cover letter (.txt)
            </button>
          </>
        )}
      </div>

      {hasCoverLetter && (
        <div className="public-resume-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "resume"}
            className={`public-resume-tab ${activeTab === "resume" ? "active" : ""}`}
            onClick={() => setActiveTab("resume")}
          >
            Resume
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "cover-letter"}
            className={`public-resume-tab ${activeTab === "cover-letter" ? "active" : ""}`}
            onClick={() => setActiveTab("cover-letter")}
          >
            Cover Letter
          </button>
        </div>
      )}

      {/*
        Both panels stay in the DOM regardless of the active tab — hidden on
        screen via CSS, but forced visible in print (see global.css's
        @media print rules) so "Print / Save as PDF" always offers both
        documents. The browser's own print dialog lets the viewer choose to
        print all pages or just a range, which covers "print both, or just
        one, if so choose" without needing separate print buttons per tab.
      */}
      <div className={`public-resume-tab-panel ${activeTab === "resume" ? "" : "public-resume-tab-panel-hidden"}`}>
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
        />
        {(() => {
          const answerEntries = Object.entries(resume.answers).filter(([, v]) => v && v.trim());
          if (answerEntries.length === 0) return null;
          return (
            <div className="public-resume-card public-resume-details">
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
      </div>

      {hasCoverLetter && (
        <div
          className={`public-resume-tab-panel public-resume-cover-letter ${
            activeTab === "cover-letter" ? "" : "public-resume-tab-panel-hidden"
          }`}
        >
          <div className="public-resume-card">
            <h2 className="public-resume-details-heading">Cover Letter</h2>
            <p className="public-resume-cover-letter-text">{resume.generatedCoverLetter}</p>
          </div>
        </div>
      )}
    </div>
  );
}
