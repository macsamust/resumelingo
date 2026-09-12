import { MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { careerLoopApi } from "../../api";
import { CareerLoopProgress, SubscriptionTier } from "../../types";
import { useToast } from "../common/Toast";
import { formatRelativeTime } from "../../utils/time";

interface Props {
  resumeId: string;
  resumeSlug: string;
  resumeCreatedAt: string;
  subscriptionTier: SubscriptionTier;
}

// Same 4-segment ring geometry as the earlier dashboard-card version, just
// smaller — this is now a permanent, always-on badge on every resume tile
// rather than a temporary card, so it has to stay visually quiet.
const RING_SIZE = 30;
const RING_RADIUS = 12;
const RING_STROKE = 4;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_GAP_DEG = 10;
const RING_SEGMENT_DEG = 90 - RING_GAP_DEG;
const RING_SEGMENT_LENGTH = RING_CIRCUMFERENCE * (RING_SEGMENT_DEG / 360);
const RING_DASHARRAY = `${RING_SEGMENT_LENGTH} ${RING_CIRCUMFERENCE - RING_SEGMENT_LENGTH}`;

function RingSegment({ index, done }: { index: number; done: boolean }) {
  const rotation = -90 + index * 90 + RING_GAP_DEG / 2;
  return (
    <circle
      cx={RING_SIZE / 2}
      cy={RING_SIZE / 2}
      r={RING_RADIUS}
      fill="none"
      stroke={done ? "var(--teal)" : "var(--border)"}
      strokeWidth={RING_STROKE}
      strokeLinecap="round"
      strokeDasharray={RING_DASHARRAY}
      transform={`rotate(${rotation} ${RING_SIZE / 2} ${RING_SIZE / 2})`}
    />
  );
}

/**
 * "Full Circle" — permanent per-resume identity, replacing the earlier
 * approach (a single temporary dashboard card + a post-publish popup, both
 * removed). See docs/full-circle-coach-build-brief.md's revision history:
 * that approach read as a generic SaaS onboarding checklist, which clashed
 * with "full circle career portfolio" as a brand promise. This version is
 * always there, on every resume tile, costs the card layout nothing beyond
 * a small corner badge, and only reveals its narrative "journey" ledger
 * (not a checklist — nothing is ever shown as locked/greyed, an unmet step
 * just reads as an invitation) on hover or click.
 *
 * Renders nothing at all whenever there's no progress to show — same
 * resilience pattern as before: the API 404s outright while
 * CAREER_LOOP_ENABLED is off, so "feature disabled" and "nothing to show"
 * collapse into the same catch branch.
 */
export function ResumeLoopBadge({ resumeId, resumeSlug, resumeCreatedAt, subscriptionTier }: Props) {
  const { showToast } = useToast();
  const [progress, setProgress] = useState<CareerLoopProgress | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Set by ResumeEditPage right after this resume is first published — a
  // one-time visual pulse so the eye lands on where the loop actually lives
  // instead of just hearing about it in a toast that's already gone by the
  // time someone's back on the dashboard. Consumed (removed) immediately so
  // it never pulses again on a later visit.
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const key = `resumelingo:loop-pulse:${resumeId}`;
    if (sessionStorage.getItem(key) === "1") {
      sessionStorage.removeItem(key);
      setPulse(true);
    }
    careerLoopApi
      .getProgress(resumeId)
      .then((res) => setProgress(res.progress))
      .catch(() => setProgress(null))
      .finally(() => setLoaded(true));
  }, [resumeId]);

  // Close on outside click — same pattern DashboardPage already uses for
  // the resume-menu-dropdown.
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  if (!loaded || !progress) return null;

  const trackLocked = subscriptionTier === "starter";
  const lettersLocked = subscriptionTier !== "premium";
  const doneFlags = [true, progress.share, progress.track, progress.letters];
  const doneCount = doneFlags.filter(Boolean).length;

  const celebrateIfComplete = (next: CareerLoopProgress) => {
    if (!progress.completed && next.completed) {
      showToast("success", "Full circle — you've closed the loop on this resume.");
    }
  };

  const copyLink = async (e: ReactMouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/r/${resumeSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("success", "Link copied.");
    } catch {
      showToast("error", "Couldn't copy the link.");
      return;
    }
    setBusy(true);
    try {
      const res = await careerLoopApi.markShared(resumeId);
      celebrateIfComplete(res.progress);
      setProgress(res.progress);
    } catch {
      // Non-critical bookkeeping — the link itself already copied.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="resume-loop-badge-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`resume-loop-badge ${pulse ? "resume-loop-badge-pulse" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
          setPulse(false);
        }}
        aria-label={`Resume journey: ${doneCount} of 4 steps`}
        aria-expanded={open}
      >
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          {doneFlags.map((done, i) => (
            <RingSegment key={i} index={i} done={done} />
          ))}
        </svg>
      </button>
      {open && (
        <div className="resume-loop-popover" onClick={(e) => e.stopPropagation()}>
          <p className="resume-loop-popover-title">This resume's journey</p>
          <div className="resume-loop-ledger">
            <div className="resume-loop-ledger-row is-done">
              <span className="resume-loop-ledger-check">✓</span>
              <span>Published {formatRelativeTime(resumeCreatedAt)}</span>
            </div>
            <div className={`resume-loop-ledger-row ${progress.share ? "is-done" : ""}`}>
              <span className="resume-loop-ledger-check">{progress.share ? "✓" : ""}</span>
              {progress.share ? (
                <span>Shared</span>
              ) : (
                <button className="resume-loop-ledger-action" onClick={copyLink} disabled={busy}>
                  Copy link to share
                </button>
              )}
            </div>
            <div className={`resume-loop-ledger-row ${progress.track ? "is-done" : ""}`}>
              <span className="resume-loop-ledger-check">{progress.track ? "✓" : ""}</span>
              {progress.track ? (
                <span>Applications tracked</span>
              ) : trackLocked ? (
                <span className="resume-loop-ledger-invite">
                  Add tracking to this resume's story <span className="resume-loop-tag">Pro+</span>
                </span>
              ) : (
                <Link to="/job-applications" className="resume-loop-ledger-action" onClick={() => setOpen(false)}>
                  Log an application
                </Link>
              )}
            </div>
            <div className={`resume-loop-ledger-row ${progress.letters ? "is-done" : ""}`}>
              <span className="resume-loop-ledger-check">{progress.letters ? "✓" : ""}</span>
              {progress.letters ? (
                <span>Letter sent</span>
              ) : lettersLocked ? (
                <span className="resume-loop-ledger-invite">
                  Add a letter to this resume's story <span className="resume-loop-tag">Premium</span>
                </span>
              ) : (
                <Link to="/cover-letter" className="resume-loop-ledger-action" onClick={() => setOpen(false)}>
                  Write a cover letter
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
