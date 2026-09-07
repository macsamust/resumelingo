import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resumeRefreshApi, ApiError, ResumeRefreshDraftItem } from "../api";

type Step =
  | "loading"
  | "error"
  | "question" // "Are you still working at {company} as {title}?"
  | "no" // linked out to Edit Resume, nothing more to do here
  | "pickKeyword" // fast path: clickable curated keywords, multi-select
  | "carForm" // deep path: Challenge/Action/Result
  | "reviewBullets" // shared preview/edit step before commit — one or more drafts
  | "done";

/**
 * The AI Resume Refresh nudge's no-login landing page (see TODO.md's
 * finalized scope) — reached from ResumeRefreshNudgeService's daily email.
 * Deliberately no login: the signed token in the URL is what proves this is
 * the right account/resume (see ResumeRefreshController's doc comment).
 *
 * Two ways into new bullets — a fast path (select one or more curated
 * keywords, mirroring the "Generate from keywords" tool already in Edit
 * Resume) and a deep path (fill out a Challenge/Action/Result entry) — both
 * land on the same review step, since neither one auto-commits: the person
 * always sees the drafted bullet text(s) and can edit them before anything
 * is actually saved (see ResumeRefreshController.commit's doc comment).
 */
export function ResumeRefreshPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState<string | null>(null);
  const [resumeTitle, setResumeTitle] = useState("");
  const [company, setCompany] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [usedKeywords, setUsedKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [draftItems, setDraftItems] = useState<ResumeRefreshDraftItem[]>([]);
  const [skippedDuplicates, setSkippedDuplicates] = useState(0);
  // Which step led into reviewBullets — so its Back button returns to the
  // right screen (the keyword picker with the selection still intact, or
  // the CAR form with its fields still intact) rather than always going to
  // one hardcoded place.
  const [reviewedFrom, setReviewedFrom] = useState<"pickKeyword" | "carForm">("pickKeyword");

  const [carChallenge, setCarChallenge] = useState("");
  const [carAction, setCarAction] = useState("");
  const [carResult, setCarResult] = useState("");

  useEffect(() => {
    if (!token) {
      setError("This link is missing its token. Please use the link from your email.");
      setStep("error");
      return;
    }
    resumeRefreshApi
      .preview(token)
      .then((data) => {
        setResumeTitle(data.resumeTitle);
        setCompany(data.company);
        setJobTitle(data.jobTitle);
        setKeywords(data.keywords);
        setUsedKeywords(data.usedKeywords);
        setStep("question");
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "This link is invalid or has expired.");
        setStep("error");
      });
  }, [token]);

  const toggleKeyword = (keyword: string) => {
    if (usedKeywords.includes(keyword)) return; // already reflected in a bullet on this resume — see usedKeywords' doc comment on the worker side
    setSelectedKeywords((prev) => (prev.includes(keyword) ? prev.filter((k) => k !== keyword) : [...prev, keyword]));
  };

  const onDraftFromKeywords = async () => {
    if (selectedKeywords.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { achievements } = await resumeRefreshApi.previewKeywordBullet(token, selectedKeywords);
      setDraftItems(achievements.map((achievement) => ({ achievement, bulletText: achievement.action })));
      setReviewedFrom("pickKeyword");
      setStep("reviewBullets");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmitCar = async () => {
    setBusy(true);
    setError(null);
    try {
      const { achievement, bulletText } = await resumeRefreshApi.previewCarBullet(token, {
        challenge: carChallenge,
        action: carAction,
        result: carResult,
      });
      setDraftItems([{ achievement, bulletText }]);
      setReviewedFrom("carForm");
      setStep("reviewBullets");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const updateDraftBullet = (index: number, bulletText: string) => {
    setDraftItems((prev) => prev.map((item, i) => (i === index ? { ...item, bulletText } : item)));
  };

  const onCommit = async () => {
    const items = draftItems.filter((item) => item.bulletText.trim());
    if (items.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await resumeRefreshApi.commit(token, items);
      setSkippedDuplicates(result.skippedDuplicates);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong saving that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Only works when this tab was opened directly by a user click (e.g. from
  // an email link that opens a new tab), which browsers allow scripts to
  // close; a tab the person navigated to some other way silently ignores
  // this, so the "Go to ResumeLingo" link stays as the fallback either way.
  const onCloseWindow = () => window.close();

  if (step === "loading") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Resume check-in</h1>
          <p className="sub">Loading…</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Resume check-in</h1>
          <div className="form-error">{error}</div>
          <p className="form-footnote">
            <Link to="/login">Back to ResumeLingo</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <h1>Resume check-in</h1>
        {error && <div className="form-error">{error}</div>}

        {step === "question" && (
          <>
            <p className="sub">
              {company && jobTitle
                ? `Are you still working at ${company} as ${jobTitle}?`
                : `Is "${resumeTitle}" still up to date?`}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep("pickKeyword")}>
                Yes
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep("no")}>
                No
              </button>
            </div>
          </>
        )}

        {step === "no" && (
          <>
            <p className="sub">No problem — log in to update your resume with your current role.</p>
            <Link className="btn btn-primary btn-block" to="/login">
              Go to ResumeLingo
            </Link>
          </>
        )}

        {step === "pickKeyword" && (
          <>
            <p className="sub">
              A few keywords worth considering for this role, from our curated list for this profession. Select one
              or more to draft bullets from them — nothing saves until you approve them.
            </p>
            {keywords.length > 0 ? (
              <div className="skill-picker-chips" style={{ marginBottom: 16 }}>
                {keywords.map((k) => {
                  const selected = selectedKeywords.includes(k);
                  const used = usedKeywords.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`skill-picker-chip ${selected ? "selected" : ""}`}
                      disabled={busy || used}
                      title={used ? "Already added to this resume" : undefined}
                      style={used ? { opacity: 0.5, cursor: "not-allowed", textDecoration: "line-through" } : undefined}
                      onClick={() => toggleKeyword(k)}
                    >
                      {selected ? "✓ " : ""}
                      {k}
                      {used ? " (added)" : ""}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="hero-note">No curated keywords for this profession yet.</p>
            )}
            {keywords.length > 0 && (
              <button className="btn btn-primary btn-block" onClick={onDraftFromKeywords} disabled={busy || selectedKeywords.length === 0}>
                {busy
                  ? "Drafting…"
                  : selectedKeywords.length === 0
                  ? "Select a keyword to draft a bullet"
                  : `Draft ${selectedKeywords.length} bullet${selectedKeywords.length === 1 ? "" : "s"}`}
              </button>
            )}
            <p className="form-footnote">
              <button
                className="btn-link"
                style={{ background: "none", border: "none", padding: 0, color: "var(--indigo)", cursor: "pointer" }}
                onClick={() => setStep("carForm")}
              >
                Or describe what you did yourself →
              </button>
            </p>
          </>
        )}

        {step === "carForm" && (
          <>
            <p className="sub">Describe what you did in your own words — we'll turn it into a resume bullet.</p>
            <div className="field">
              <label>Challenge — what problem or situation did you face?</label>
              <textarea rows={2} value={carChallenge} onChange={(e) => setCarChallenge(e.target.value)} />
            </div>
            <div className="field">
              <label>Action — what did you do about it?</label>
              <textarea rows={2} value={carAction} onChange={(e) => setCarAction(e.target.value)} />
            </div>
            <div className="field">
              <label>Result — what changed because of it?</label>
              <textarea rows={2} value={carResult} onChange={(e) => setCarResult(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-block" onClick={onSubmitCar} disabled={busy} style={{ marginBottom: 10 }}>
              {busy ? "Drafting…" : "Draft a bullet"}
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setStep("pickKeyword")} disabled={busy}>
              ← Back
            </button>
          </>
        )}

        {step === "reviewBullets" && (
          <>
            <p className="sub">
              Here's what we drafted — edit as you'd like before adding {draftItems.length === 1 ? "it" : "them"} to
              your resume.
            </p>
            {draftItems.map((item, i) => (
              <div className="field" key={i}>
                <label>Resume bullet {draftItems.length > 1 ? i + 1 : ""}</label>
                <textarea rows={3} value={item.bulletText} onChange={(e) => updateDraftBullet(i, e.target.value)} />
              </div>
            ))}
            <button
              className="btn btn-primary btn-block"
              onClick={onCommit}
              disabled={busy || draftItems.every((item) => !item.bulletText.trim())}
              style={{ marginBottom: 10 }}
            >
              {busy ? "Adding…" : `Add ${draftItems.length > 1 ? "these bullets" : "this bullet"} to my resume`}
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setStep(reviewedFrom)} disabled={busy}>
              ← Back
            </button>
          </>
        )}

        {step === "done" && (
          <>
            <p className="sub">Added! Your resume now includes {draftItems.length === 1 ? "this bullet" : "these bullets"}.</p>
            {skippedDuplicates > 0 && (
              <p className="hero-note" style={{ marginBottom: 16 }}>
                ({skippedDuplicates} of {draftItems.length} {skippedDuplicates === 1 ? "was" : "were"} already on this
                resume, so {skippedDuplicates === 1 ? "it wasn't" : "those weren't"} added again.)
              </p>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCloseWindow}>
                Close this window
              </button>
              <Link className="btn btn-primary" style={{ flex: 1 }} to="/login">
                Go to ResumeLingo
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
