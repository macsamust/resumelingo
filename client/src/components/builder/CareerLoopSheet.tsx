import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../common/Modal";
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

const STEPS: { key: StepKey; label: string }[] = [
  { key: "resume", label: "Resume" },
  { key: "share", label: "Share" },
  { key: "track", label: "Track" },
  { key: "letters", label: "Letters" },
];

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

  const goToLetters = () => {
    onClose();
    navigate("/cover-letter");
  };

  let primaryLabel = "Copy my link";
  let primaryAction: (() => void) | null = copyLink;
  let softUpgradeCopy: string | null = null;

  if (shared) {
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
      <p className="hero-note" style={{ marginTop: -4, marginBottom: 16 }}>
        One step done. Keep the circle moving.
      </p>
      <div style={{ display: "flex", flexDirection: "column", marginBottom: 16 }}>
        {STEPS.map((s, i) => {
          const done = s.key === "resume" || (s.key === "share" && shared);
          return (
            <div
              key={s.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <span style={{ color: done ? "var(--teal)" : "var(--muted)", fontSize: 16, width: 18, textAlign: "center" }}>
                {done ? "✓" : "○"}
              </span>
              <span style={{ fontSize: 14, color: done ? "var(--muted)" : "inherit", textDecoration: done ? "line-through" : "none" }}>
                {s.label}
              </span>
              {s.key === "letters" && lettersLocked && (
                <span className="career-loop-next" style={{ marginLeft: "auto" }}>
                  Premium
                </span>
              )}
              {s.key === "track" && trackLocked && (
                <span className="career-loop-next" style={{ marginLeft: "auto" }}>
                  Professional+
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
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
