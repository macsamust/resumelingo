import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ParrotLogo } from "../components/brand/ParrotLogo";
import { useAuth } from "../context/AuthContext";
import { ApiError, coverLetterApi, resumeApi } from "../api";
import { Resume } from "../types";

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

function CoverLetterLocked() {
  return (
    <AppShell>
      <div className="app-page-head">
        <h1>Cover Letter</h1>
      </div>
      <div className="empty-state">
        <div className="poly-row" style={{ justifyContent: "center" }}>
          <div className="poly-avatar-slot">
            <ParrotLogo size={40} decorative={false} />
          </div>
          <p style={{ margin: 0 }}>I'd love to help you write one, but AI cover letters are a Premium feature. Upgrade your plan to write one.</p>
        </div>
        <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 16 }}>
          Upgrade my plan
        </Link>
      </div>
    </AppShell>
  );
}

/**
 * The standalone Cover Letter tool (Sep 2026 QA pass — see TODO.md's
 * "Cover Letter parity with Thank-You Letter" entry). Same "one-off
 * generator, nothing saved" shape as ThankYouLetterPage, plus a resume
 * picker so the letter can pull real profession/summary/experience content
 * instead of asking the person to retype all of that here. Unlike the
 * resume-embedded checkbox this replaces as the primary way to get a cover
 * letter (still present in the editor, unchanged, for anyone mid-build who
 * wants one saved alongside that resume) this one lets the letter actually
 * target a specific company/role, and its result can be edited before
 * copying or downloading.
 */
export function CoverLetterPage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [hiringManagerName, setHiringManagerName] = useState("");
  const [letter, setLetter] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user?.subscriptionTier !== "premium") return;
    resumeApi
      .list()
      .then((res) => {
        setResumes(res.resumes);
        // Defaults to the most recently updated resume (list's own default
        // order) rather than leaving the picker blank — one fewer click for
        // the common case of "the resume I'm currently working on."
        if (res.resumes.length > 0) setResumeId(res.resumes[0].id);
      })
      .catch(() => {
        /* Leaves the picker empty — the form's own "choose a resume" validation covers this. */
      });
  }, [user?.subscriptionTier]);

  if (user && user.subscriptionTier !== "premium") return <CoverLetterLocked />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resumeId) return;
    setError(null);
    setCopied(false);
    setGenerating(true);
    try {
      const res = await coverLetterApi.generate({ resumeId, companyName, roleName, hiringManagerName });
      setLetter(res.letter);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong generating your letter.");
    } finally {
      setGenerating(false);
    }
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onDownload = () => {
    const filename = `${(companyName || "cover-letter").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-cover-letter.txt`;
    downloadTextFile(filename, letter.trim() + "\n");
  };

  return (
    <AppShell>
      <div className="app-page-head">
        <h1>Cover Letter</h1>
      </div>
      <p className="hero-note" style={{ marginBottom: 20 }}>
        Pick a resume to base this on, add the company and role you're targeting, and get a ready to send cover
        letter. Nothing here is saved to that resume — edit the result below, then copy or download it once you're
        happy with it.
      </p>
      {error && <div className="form-error">{error}</div>}
      {resumes.length === 0 ? (
        <p className="hero-note">
          You'll need at least one resume before you can generate a cover letter — <Link to="/resumes/new">create one first</Link>.
        </p>
      ) : (
        <div className="builder-grid">
          <form className="builder-panel" onSubmit={onSubmit}>
            <div className="field">
              <label>Base this on</label>
              <select value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Company</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Corp" />
            </div>
            <div className="field">
              <label>Role (optional — defaults to the resume's own title)</label>
              <input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. Senior Product Manager II" />
            </div>
            <div className="field">
              <label>Hiring manager's name (optional)</label>
              <input
                value={hiringManagerName}
                onChange={(e) => setHiringManagerName(e.target.value)}
                placeholder="e.g. Jordan Lee"
              />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={generating}>
              {generating ? "Writing…" : letter ? "Regenerate letter" : "Generate letter"}
            </button>
          </form>

          <div className="preview-col">
            <div className="preview-panel" style={{ minHeight: 200 }}>
              {letter ? (
                <>
                  <textarea
                    value={letter}
                    onChange={(e) => setLetter(e.target.value)}
                    rows={16}
                    style={{ width: "100%", lineHeight: 1.7, fontSize: 14.5, color: "var(--navy-light)", resize: "vertical" }}
                  />
                  <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                    <button className="btn btn-ghost" type="button" onClick={onCopy}>
                      {copied ? "Copied!" : "Copy to clipboard"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={onDownload}>
                      Download as text (.txt)
                    </button>
                  </div>
                </>
              ) : (
                <p className="hero-note" style={{ fontStyle: "italic" }}>
                  Your generated letter will appear here — you'll be able to edit it before copying or downloading.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
