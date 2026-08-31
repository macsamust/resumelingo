import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import { ApiError, thankYouLetterApi } from "../api";
import { ThankYouScenario, ThankYouScenarioOption } from "../types";

/** Fallback shown until /thank-you-letters/scenarios loads (or if it fails) — kept in sync with server/src/services/ThankYouLetterGenerator.ts's THANK_YOU_SCENARIOS. */
const DEFAULT_SCENARIOS: ThankYouScenarioOption[] = [
  { key: "post-interview", label: "After an interview" },
  { key: "offer-acceptance", label: "Accepting a job offer" },
  { key: "staying-in-touch", label: "After a rejection (staying in touch)" },
  { key: "networking", label: "After a networking conversation" },
];

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

function ThankYouLetterLocked() {
  return (
    <AppShell>
      <div className="app-page-head">
        <h1>Thank-You Letter</h1>
      </div>
      <div className="empty-state">
        <p>AI thank-you letters are a Premium feature. Upgrade your plan to write one.</p>
        <Link to="/dashboard" className="btn btn-primary">
          Upgrade my plan
        </Link>
      </div>
    </AppShell>
  );
}

/**
 * A one-off generator, not tied to any resume record — the person fills in
 * a few specifics about an interaction (company, role, who they spoke
 * with, what scenario it was) and gets back a ready-to-send note they can
 * copy or download. Unlike the resume's own AI cover letter, nothing here
 * is saved: reopening this page always starts from a blank form.
 */
export function ThankYouLetterPage() {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<ThankYouScenarioOption[]>(DEFAULT_SCENARIOS);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [interviewerName, setInterviewerName] = useState("");
  const [scenario, setScenario] = useState<ThankYouScenario>("post-interview");
  const [topic, setTopic] = useState("");
  const [letter, setLetter] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user?.subscriptionTier !== "premium") return;
    thankYouLetterApi
      .listScenarios()
      .then((res) => setScenarios(res.scenarios))
      .catch(() => {
        /* Falls back to DEFAULT_SCENARIOS above — the form still works. */
      });
  }, [user?.subscriptionTier]);

  if (user && user.subscriptionTier !== "premium") return <ThankYouLetterLocked />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCopied(false);
    setGenerating(true);
    try {
      const res = await thankYouLetterApi.generate({ company, role, interviewerName, scenario, topic });
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
    const filename = `${(company || "thank-you").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-thank-you.txt`;
    downloadTextFile(filename, letter.trim() + "\n");
  };

  return (
    <AppShell>
      <div className="app-page-head">
        <h1>Thank-You Letter</h1>
      </div>
      <p className="hero-note" style={{ marginBottom: 20 }}>
        Fill in a few details about who you're writing to, and get a ready to send thank-you note. Nothing here is
        saved. Copy or download it once you're happy with it.
      </p>
      {error && <div className="form-error">{error}</div>}

      <div className="builder-grid">
        <form className="builder-panel" onSubmit={onSubmit}>
          <div className="field">
            <label>Scenario</label>
            <select value={scenario} onChange={(e) => setScenario(e.target.value as ThankYouScenario)}>
              {scenarios.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Company</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Acme Corp" />
          </div>
          <div className="field">
            <label>Role</label>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Product Manager" />
          </div>
          <div className="field">
            <label>Interviewer / contact name (optional)</label>
            <input
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              placeholder="e.g. Jordan Lee"
            />
          </div>
          <div className="field">
            <label>Something specific you discussed (optional)</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. the team's migration to microservices"
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
                <p style={{ whiteSpace: "pre-line", lineHeight: 1.7, fontSize: 14.5, color: "var(--navy-light)" }}>
                  {letter}
                </p>
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
                Your generated letter will appear here.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
