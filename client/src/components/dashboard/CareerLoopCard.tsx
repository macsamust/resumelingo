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
  if (progress.completed) return null;
  if (progress.dismissedUntil && new Date(progress.dismissedUntil) > new Date()) return null;

  const nextStep = STEPS.find((s) => !progress[s.key]);
  const doneCount = 1 + STEPS.filter((s) => progress[s.key]).length; // +1 for the always-true Resume step

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
      <div className="career-loop-head">
        <span className="career-loop-title">Continue your loop &middot; {doneCount} of 4</span>
        <button className="career-loop-dismiss" onClick={dismiss} disabled={busy} aria-label="Skip for now">
          Skip for now
        </button>
      </div>
      <div className="career-loop-bar">
        <div className="career-loop-bar-step is-done" />
        {STEPS.map((s) => (
          <div key={s.key} className={`career-loop-bar-step ${progress[s.key] ? "is-done" : ""}`} />
        ))}
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
  );
}
