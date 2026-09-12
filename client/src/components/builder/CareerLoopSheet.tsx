import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../common/Modal";
import { PolyAvatar } from "../brand/PolyAvatar";
import { careerLoopApi } from "../../api";
import { SubscriptionTier } from "../../types";
import { useToast } from "../common/Toast";

interface Props {
  resumeId: string;
  resumeSlug: string;
  subscriptionTier: SubscriptionTier;
  onClose: () => void;
}

type StepKey = "resume" | "share" | "track" | "letters";

const STEP_INFO: Record<StepKey, { icon: string; label: string; description: string }> = {
  resume: { icon: "📝", label: "Resume", description: "Your resume is built." },
  share: {
    icon: "🔗",
    label: "Share",
    description: "Share one clean URL in LinkedIn, email, or applications — no more PDF versions.",
  },
  track: {
    icon: "📋",
    label: "Track",
    description: "Log the job applications you sent — a record of where, when, and what happened next.",
  },
  letters: {
    icon: "✉️",
    label: "Letters",
    description: "Generate a cover or thank-you letter that matches the resume you just published.",
  },
};

const STEP_ORDER: StepKey[] = ["resume", "share", "track", "letters"];

/**
 * "Full Circle" post-publish coach, one-time (post-publish sheet) state —
 * see docs/full-circle-coach-build-brief.md and CareerLoopCard.tsx (the
 * ongoing dashboard-card state this hands off to). Shown exactly once,
 * right after ResumeBuilderPage.onSubmit creates a resume — see
 * ResumeEditPage's showLoopSheet effect for the trigger.
 *
 * Deliberately doesn't fetch existing progress on mount: this only ever
 * renders immediately after a brand-new resume is created, so Share/Track/
 * Letters are always false at that point by construction. If that
 * assumption ever stops holding (e.g. this gets reused elsewhere), fetching
 * real progress here would be the fix.
 */
export function CareerLoopSheet({ resumeId, resumeSlug, subscriptionTier, onClose }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);

  const trackLocked = subscriptionTier === "starter";
  const lettersLocked = subscriptionTier !== "premium";

  const copyLink = async () => {
    const url = `${window.location.origin}/r/${resumeSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("success", "Link copied.");
    } catch {
      showToast("error", "Couldn't copy the link — you can copy it from the resume card on your dashboard instead.");
      return;
    }
    setShared(true);
    setBusy(true);
    try {
      await careerLoopApi.markShared(resumeId);
    } catch {
      // Non-critical bookkeeping — the link itself already copied.
    } finally {
      setBusy(false);
    }
  };

  const goToTracker = () => {
    onClose();
    navigate("/job-applications");
  };

  let primaryLabel = "Copy my link";
  let primaryAction: (() => void) | null = copyLink;
  let softUpgradeCopy: string | null = null;
  let currentStep: StepKey = "share";

  if (shared) {
    currentStep = "track";
    if (trackLocked) {
      softUpgradeCopy = "Tracking unlocks on Professional — for when you're running a real search.";
      primaryAction = null;
    } else {
      primaryLabel = "Log my first application";
      primaryAction = goToTracker;
    }
  }

  return (
    <Modal title="Your career loop is live" onClose={onClose}>
      <div className="career-loop-sheet-header">
        <PolyAvatar size={52} decorative />
        <p className="career-loop-sheet-intro">
          One step done. Keep the circle moving — <span>hover a step for what it does.</span>
        </p>
      </div>

      <div className="career-loop-sheet-steps">
        {STEP_ORDER.map((key) => {
          const info = STEP_INFO[key];
          const done = key === "resume" || (key === "share" && shared);
          const isCurrent = key === currentStep;
          const locked = (key === "track" && trackLocked) || (key === "letters" && lettersLocked);
          return (
            <div
              key={key}
              tabIndex={0}
              className={`career-loop-sheet-step ${done ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
            >
              <span className="career-loop-sheet-step-icon">{info.icon}</span>
              <span className="career-loop-sheet-step-label">{info.label}</span>
              {locked && <span className="career-loop-sheet-step-tag">{key === "track" ? "Pro+" : "Premium"}</span>}
              <span className="career-loop-sheet-step-check">{done ? "✓" : ""}</span>
              <span className="career-loop-tooltip" role="tooltip">
                {info.description}
              </span>
            </div>
          );
        })}
      </div>

      <div className="career-loop-sheet-footer">
        <button className="career-loop-dismiss" onClick={onClose} type="button">
          Skip for now
        </button>
        {softUpgradeCopy ? (
          <span className="career-loop-next">{softUpgradeCopy}</span>
        ) : (
          <button className="btn btn-primary" onClick={primaryAction ?? undefined} disabled={busy} type="button">
            {primaryLabel}
          </button>
        )}
      </div>
    </Modal>
  );
}
