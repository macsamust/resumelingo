import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, achievementGenerateApi } from "../../api";
import { AchievementEntry } from "../../types";

interface Props {
  /** Professional/Premium-gated (see worker's AchievementGenerateController) — caller passes whether the account's tier can use this, same as ResumeImportPanel's canImport. */
  canGenerate: boolean;
  professionLabel: string;
  /** Optional — e.g. the most recent job title in Work Experience, if any, to help the model pitch bullets at the right seniority. */
  jobTitle?: string;
  /** Achievements land as normal, fully-editable rows in the caller's own achievements list — this component has no result-review UI of its own. */
  onGenerated: (achievements: AchievementEntry[]) => void;
}

type Status = "collapsed" | "expanded" | "generating" | "error";

/**
 * "Not sure what to write?" — an inline alternative to filling out the
 * Challenge/Action/Result form from scratch, for someone starting a resume
 * with nothing to go on (as opposed to ResumeImportPanel, which extracts
 * from an existing resume). A few keywords in, a handful of draft bullets
 * out — landing as normal achievement rows the person is expected to edit,
 * not a separate "AI mode." Collapsed by default so it doesn't add visual
 * weight for anyone who already knows what to write.
 */
export function AchievementGeneratorPanel({ canGenerate, professionLabel, jobTitle, onGenerated }: Props) {
  const [status, setStatus] = useState<Status>("collapsed");
  const [keywords, setKeywords] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onGenerate = async () => {
    if (!keywords.trim()) return;
    setStatus("generating");
    setError(null);
    try {
      const { achievements } = await achievementGenerateApi.generate({ professionLabel, jobTitle, keywords });
      if (achievements.length === 0) {
        setError("Couldn't generate anything from that — try adding a bit more detail to each keyword.");
        setStatus("error");
        return;
      }
      onGenerated(achievements);
      setKeywords("");
      setStatus("collapsed");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong generating those. You can still write your own below.");
      setStatus("error");
    }
  };

  if (status === "collapsed") {
    return (
      <button type="button" className="btn btn-ai" style={{ marginBottom: 16 }} onClick={() => setStatus("expanded")}>
        <span aria-hidden="true">✨</span> Not sure what to write? Generate from keywords
      </button>
    );
  }

  return (
    <div className="hero-note-box" style={{ marginBottom: 16 }}>
      {canGenerate ? (
        <>
          <p className="hero-note" style={{ marginBottom: 10 }}>
            List a few things you did, one per line or separated by commas — plain fragments are fine (e.g. "led migration
            to Kubernetes", "mentored 3 junior engineers", "cut deploy time"). AI will turn each into a draft bullet you
            can edit before saving. It won't invent numbers or specifics you didn't give it.
          </p>
          <textarea
            rows={4}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g. led migration to Kubernetes, mentored 3 junior engineers, cut deploy time"
            disabled={status === "generating"}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onGenerate}
              disabled={status === "generating" || !keywords.trim()}
            >
              {status === "generating" ? "Generating…" : "Generate"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setStatus("collapsed");
                setError(null);
              }}
              disabled={status === "generating"}
            >
              Cancel
            </button>
          </div>
          {status === "error" && error && (
            <div className="form-error" style={{ marginTop: 10 }}>
              {error}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="hero-note" style={{ marginBottom: 12 }}>
            Generating bullets from a few keywords requires the Professional or Premium plan.
          </p>
          <Link to="/#pricing" className="btn btn-ghost">
            Upgrade to use this tool
          </Link>
        </>
      )}
    </div>
  );
}
