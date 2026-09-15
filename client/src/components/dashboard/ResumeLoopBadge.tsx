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
// rather than a temporary card. Sized up slightly (was 30/12/4) after
// feedback that the badge needed more presence.
const RING_SIZE = 36;
const RING_RADIUS = 14;
const RING_STROKE = 5;
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
 * a small corner badge, and only reveals its narrative "circle" ledger
 * (not a checklist — nothing is ever shown as locked/greyed, an unmet step
 * just reads as an invitation) on hover or click. Says "circle," never
 * "journey" — the word doesn't appear anywhere else on the site, and
 * "circle" is the load-bearing word in the marketing positioning
 * (FullCircle.tsx) this feature is named after.
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
    // Pulsing and loading progress are NOT alternatives — this used to be
    // an if/else (pulse OR fetch), which meant a resume with the pulse flag
    // set never called getProgress and never set `loaded`, so the badge
    // rendered nothing at all (see the component's `if (!loaded ||
    // !progress) return null`) until a later remount found the flag already
    // consumed and fell through to the real fetch. Both need to happen on
    // every mount: the badge needs its actual progress to render at all,
    // independent of whether this particular visit also plays the one-time
    // pulse animation.
    const key = `resumelingo:loop-pulse:${resumeId}`;
    let pulseTimer: ReturnType<typeof setTimeout> | undefined;
    if (sessionStorage.getItem(key) === "1") {
      sessionStorage.removeItem(key);
      setPulse(true);
      // Auto-clears once the pulse animation's done (3 iterations of the
      // 1.6s keyframe). Both this class and the continuous glow class set
      // the `animation` shorthand, so as long as `pulse` stayed true
      // forever (previously only cleared on click), it would permanently
      // win the cascade and silently suppress the glow on any resume
      // nobody happened to click right after publishing.
      pulseTimer = setTimeout(() => setPulse(false), 4800);
    }
    careerLoopApi
      .getProgress(resumeId)
      .then((res) => setProgress(res.progress))
      .catch(() => setProgress(null))
      .finally(() => setLoaded(true));
    return () => {
      if (pulseTimer) clearTimeout(pulseTimer);
    };
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
      showToast("success", "Full circle — you've come back around on this resume.");
    }
  };

  const copyLink = async (e: ReactMouseEvent) => {
    e.stopPropagation();
    careerLoopApi.logCtaClick(resumeId, "share").catch(() => {});
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
        className={`resume-loop-badge ${pulse ? "resume-loop-badge-pulse" : ""} ${
          !progress.completed ? "resume-loop-badge-glow" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => {
            const next = !v;
            // "shown" logging (see migrations/0046_career_loop_events.sql) —
            // only on the open transition, not every toggle, so repeatedly
            // opening/closing the same popover doesn't inflate the count.
            if (next) careerLoopApi.logShown(resumeId).catch(() => {});
            return next;
          });
          setPulse(false);
        }}
        aria-label={`This resume's circle: ${doneCount} of 4 steps`}
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
          <p className="resume-loop-popover-title">This resume's circle</p>
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
                <Link
                  to="/job-applications"
                  className="resume-loop-ledger-action"
                  onClick={() => {
                    careerLoopApi.logCtaClick(resumeId, "track").catch(() => {});
                    setOpen(false);
                  }}
                >
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
                <Link
                  to="/cover-letter"
                  className="resume-loop-ledger-action"
                  onClick={() => {
                    careerLoopApi.logCtaClick(resumeId, "letters").catch(() => {});
                    setOpen(false);
                  }}
                >
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
