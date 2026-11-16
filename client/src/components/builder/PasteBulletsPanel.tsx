import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, achievementGenerateApi } from "../../api";
import { parseBullets } from "../../utils/parseBullets";
import { PolyLoader } from "../brand/PolyLoader";

interface Props {
  /** Shown on the Add button, e.g. "Senior PM, Acme Corp". Null for the flat (not grouped by job) layout. */
  jobLabel: string | null;
  /** Passed to the AI as extra context for the tone/seniority, e.g. "Senior PM at Acme Corp". */
  jobTitle?: string;
  /** Action text of bullets already under this job (or in the flat list), so duplicates in the paste are skipped. */
  existing: string[];
  /** Undefined hides the "Have Poly tighten these" button entirely (e.g. the Admin edit page). enabled=false shows it with an upgrade note instead. */
  ai?: { enabled: boolean; professionLabel: string };
  onAdd: (bullets: string[]) => void;
  onCancel: () => void;
}

/** Bullets per AI call. The worker accepts up to 30; chunking keeps each response small and quick, and a big paste still works. */
const TIGHTEN_CHUNK = 20;

/**
 * "Paste multiple bullets" — a bulk alternative to adding achievements one at
 * a time. The pasted text is cleaned live (see utils/parseBullets.ts) into a
 * preview; "Have Poly tighten these" optionally rewrites each into
 * impact-focused wording (Professional/Premium, same gate as "Generate from
 * keywords"). Nothing is added until the person clicks Add, and tightened
 * bullets always show what they were before so nothing is changed behind
 * their back.
 */
export function PasteBulletsPanel({ jobLabel, jobTitle, existing, ai, onAdd, onCancel }: Props) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseBullets(text, existing), [text, existing]);

  // Tightened wording, index-aligned to parsed.bullets. Dropped as soon as the
  // pasted text changes, since the alignment would no longer hold.
  const [tightened, setTightened] = useState<string[] | null>(null);
  const [tightenedFor, setTightenedFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showTightened = tightened !== null && tightenedFor === text && tightened.length === parsed.bullets.length;
  const finalBullets = showTightened ? tightened : parsed.bullets;
  const changedCount = showTightened ? tightened.filter((t, i) => t !== parsed.bullets[i]).length : 0;

  const tighten = async () => {
    if (parsed.bullets.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const out: string[] = [];
      for (let i = 0; i < parsed.bullets.length; i += TIGHTEN_CHUNK) {
        const chunk = parsed.bullets.slice(i, i + TIGHTEN_CHUNK);
        const { bullets } = await achievementGenerateApi.tighten({
          professionLabel: ai?.professionLabel ?? "",
          jobTitle,
          bullets: chunk,
        });
        // The worker always returns the same count; guard anyway so a bad response can never misalign the preview.
        out.push(...(bullets.length === chunk.length ? bullets : chunk));
      }
      setTightened(out);
      setTightenedFor(text);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong tightening those. You can still add them as written.");
    } finally {
      setBusy(false);
    }
  };

  const count = finalBullets.length;

  return (
    <div className="paste-bullets">
      <label className="paste-bullets-label" htmlFor="paste-bullets-input">
        Paste one bullet per line. Bullet symbols and numbers are removed for you.
      </label>
      <textarea
        id="paste-bullets-input"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
        placeholder={"• Led the migration to Kubernetes\n• Mentored 3 junior engineers\n• Cut deploy time from 40 to 12 minutes"}
      />

      {count > 0 && (
        <div className="paste-bullets-preview">
          <div className="paste-bullets-preview-title">Preview</div>
          {finalBullets.map((b, i) => {
            const was = showTightened && b !== parsed.bullets[i] ? parsed.bullets[i] : null;
            return (
              <div className="paste-bullets-item" key={i}>
                <span className="paste-bullets-n">{i + 1}</span>
                <span className="paste-bullets-text">
                  {b}
                  {was && <span className="paste-bullets-was">Was: {was}</span>}
                </span>
                {was && <span className="paste-bullets-badge">tightened</span>}
              </div>
            );
          })}
        </div>
      )}

      {(parsed.skipped > 0 || parsed.joined > 0) && (
        <p className="hero-note" style={{ marginTop: 8 }}>
          {[
            parsed.joined > 0 ? `${parsed.joined} wrapped ${parsed.joined === 1 ? "line was" : "lines were"} joined` : null,
            parsed.skipped > 0 ? `${parsed.skipped} duplicate${parsed.skipped === 1 ? "" : "s"} skipped` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {ai && count > 0 && (
        <div className="paste-bullets-ai">
          {ai.enabled ? (
            busy ? (
              <PolyLoader label="Poly is tightening…" />
            ) : showTightened ? (
              <>
                <span className="hero-note" style={{ margin: 0 }}>
                  {changedCount === 0 ? "Poly thought these were already tight." : `Poly reworded ${changedCount} of ${count}.`} Nothing is added until you click Add.
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTightened(null)}>
                  Keep my original wording
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-ai btn-sm" onClick={tighten}>
                  <span aria-hidden="true">✨</span> Have Poly tighten these
                </button>
                <span className="hero-note" style={{ margin: 0 }}>
                  Rewrites each into impact-focused wording. Keeps your facts and numbers, never invents any.
                </span>
              </>
            )
          ) : (
            <span className="hero-note" style={{ margin: 0 }}>
              Having Poly tighten bullets requires the Professional or Premium plan.{" "}
              <Link to="/#pricing" target="_blank" rel="noopener noreferrer">
                Upgrade plan
              </Link>
            </span>
          )}
        </div>
      )}
      {error && (
        <div className="form-error" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}

      <div className="paste-bullets-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || count === 0} onClick={() => onAdd(finalBullets)}>
          {count === 0 ? "Add bullets" : `Add ${count} bullet${count === 1 ? "" : "s"}${jobLabel ? ` to ${jobLabel}` : ""}`}
        </button>
      </div>
    </div>
  );
}
