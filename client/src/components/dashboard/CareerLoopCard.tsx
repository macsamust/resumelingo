import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { careerLoopApi } from "../../api";
import { CareerLoopProgress, SubscriptionTier } from "../../types";
import { useToast } from "../common/Toast";

interface Props {
  resumeId: string;
  resumeSlug: string;
  subscriptionTier: SubscriptionTier;
}

type StepKey = "share" | "track" | "letters";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "share", label: "Share" },
  { key: "track", label: "Track" },
  { key: "letters", label: "Letters" },
];

// Geometry for CareerLoopRing below — a 4-segment ring (Resume/Share/Track/
// Letters) rather than a smooth percentage arc, since the point is "4
// discrete things," not "62% done." Segments are quarter-circles with a
// small gap between them so each step reads as its own arc, not one
// continuous ring.
const RING_SIZE = 60;
const RING_RADIUS = 24;
const RING_STROKE = 7;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_GAP_DEG = 8;
const RING_SEGMENT_DEG = 90 - RING_GAP_DEG;
const RING_SEGMENT_LENGTH = RING_CIRCUMFERENCE * (RING_SEGMENT_DEG / 360);
const RING_DASHARRAY = `${RING_SEGMENT_LENGTH} ${RING_CIRCUMFERENCE - RING_SEGMENT_LENGTH}`;

/** One quarter-arc of the ring, index 0-3 clockwise from 12 o'clock (Resume, Share, Track, Letters). */
function CareerLoopRingSegment({ index, done }: { index: number; done: boolean }) {
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
      style={{ transition: "stroke .3s ease" }}
    />
  );
}

function CareerLoopRing({ doneFlags, celebrate }: { doneFlags: boolean[]; celebrate?: boolean }) {
  const doneCount = doneFlags.filter(Boolean).length;
  return (
    <div className="career-loop-ring-wrap">
      <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        {doneFlags.map((done, i) => (
          <CareerLoopRingSegment key={i} index={i} done={done} />
        ))}
      </svg>
      <span className="career-loop-ring-label">{celebrate ? "🎉" : `${doneCount}/4`}</span>
    </div>
  );
}

const celebratedKey = (resumeId: string) => `resumelingo:loop-celebrated:${resumeId}`;

/**
 * "Full Circle" post-publish coach, ongoing (dashboard) state — see
 * docs/full-circle-coach-build-brief.md and worker's CareerLoopService.ts.
 * Renders nothing (not even a loading flash) whenever there's no progress
 * to show: the API 404s outright while CAREER_LOOP_ENABLED is off, so the
 * "hide entirely" and "feature disabled" cases collapse into the same
 * catch branch below.
 *
 * v1 scope, deliberately: this only ever renders for one resume at a time
 * (the most recently updated one — see DashboardPage.tsx's loopResume),
 * not one card per resume. The post-publish sheet (PR 3) is the only other
 * planned surface; there's no separate nav item.
 */
export function CareerLoopCard({ resumeId, resumeSlug, subscriptionTier }: Props) {
  const { showToast } = useToast();
  const [progress, setProgress] = useState<CareerLoopProgress | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  // Client-only: whether this resume's "loop complete" celebration has
  // already been shown and acknowledged. There's no server-side field for
  // this (completion is derived, not stored) — a per-resume localStorage
  // flag is enough to make the celebration a one-time thing without adding
  // a migration just for "did we already say congrats."
  const [celebrationDismissed, setCelebrationDismissed] = useState(
    () => localStorage.getItem(celebratedKey(resumeId)) === "1"
  );

  const load = () => {
    careerLoopApi
      .getProgress(resumeId)
      .then((res) => setProgress(res.progress))
      .catch(() => setProgress(null))
      .finally(() => setLoaded(true));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [resumeId]);

  if (!loaded || !progress) return null;
  if (progress.completed && celebrationDismissed) return null;
  if (!progress.completed && progress.dismissedUntil && new Date(progress.dismissedUntil) > new Date()) return null;

  const doneFlags = [true, progress.share, progress.track, progress.letters]; // Resume is always true

  if (progress.completed) {
    const acknowledge = () => {
      localStorage.setItem(celebratedKey(resumeId), "1");
      setCelebrationDismissed(true);
    };
    return (
      <div className="career-loop-card career-loop-card-celebrate">
        <CareerLoopRing doneFlags={doneFlags} celebrate />
        <div className="career-loop-celebrate-body">
          <span className="career-loop-title">Loop complete &middot; nice work!</span>
          <span className="career-loop-next">
            You built it, shared it, tracked it, and followed up. That's the whole circle.
          </span>
        </div>
        <button className="btn btn-primary" onClick={acknowledge}>
          Nice
        </button>
      </div>
    );
  }

  const nextStep = STEPS.find((s) => !progress[s.key]);

  const copyLink = async () => {
    const url = `${window.location.origin}/r/${resumeSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("success", "Link copied.");
    } catch {
      showToast("error", "Couldn't copy the link — copy it directly from the resume card below.");
      return;
    }
    setBusy(true);
    try {
      const res = await careerLoopApi.markShared(resumeId);
      setProgress(res.progress);
    } catch {
      // Non-critical bookkeeping call — the link itself already copied
      // successfully, so failing quietly here is the right call rather
      // than showing a second, confusing error toast.
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    setBusy(true);
    try {
      await careerLoopApi.dismiss(resumeId);
      setProgress({ ...progress, dismissedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() });
    } catch {
      showToast("error", "Couldn't dismiss right now.");
    } finally {
      setBusy(false);
    }
  };

  // Track needs Professional+, Letters needs Premium (matches
  // ThankYouLetterController/CoverLetterController's own gates) — shown as
  // a soft-upgrade line rather than a dead/disabled CTA, per the build
  // brief's "soft upgrade, step stays undone" rule.
  const trackLocked = subscriptionTier === "starter";
  const lettersLocked = subscriptionTier !== "premium";

  let ctaLabel = "Copy my link";
  let ctaAction: (() => void) | null = copyLink;
  let ctaTo: string | null = null;
  let softUpgradeCopy: string | null = null;

  if (nextStep?.key === "track") {
    if (trackLocked) {
      softUpgradeCopy = "Tracking unlocks on Professional — for when you're running a real search.";
      ctaAction = null;
    } else {
      ctaLabel = "Log an application";
      ctaAction = null;
      ctaTo = "/job-applications";
    }
  } else if (nextStep?.key === "letters") {
    if (lettersLocked) {
      softUpgradeCopy = "Letters close the loop on Premium.";
      ctaAction = null;
    } else {
      ctaLabel = "Write a cover letter";
      ctaAction = null;
      ctaTo = "/cover-letter";
    }
  }

  return (
    <div className="career-loop-card">
      <CareerLoopRing doneFlags={doneFlags} />
      <div className="career-loop-body">
        <div className="career-loop-head">
          <span className="career-loop-title">Continue your loop</span>
          <button className="career-loop-dismiss" onClick={dismiss} disabled={busy} aria-label="Skip for now">
            Skip for now
          </button>
        </div>
        <div className="career-loop-footer">
          {softUpgradeCopy ? (
            <>
              <span className="career-loop-next">{softUpgradeCopy}</span>
              <Link to="/#pricing" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                See plans
              </Link>
            </>
          ) : (
            <>
              <span className="career-loop-next">Next: {ctaLabel.toLowerCase()}</span>
              {ctaTo ? (
                <Link to={ctaTo} className="btn btn-primary">
                  {ctaLabel}
                </Link>
              ) : (
                <button className="btn btn-primary" onClick={ctaAction ?? undefined} disabled={busy}>
                  {ctaLabel}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
