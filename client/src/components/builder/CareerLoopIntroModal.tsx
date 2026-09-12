import { useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "../common/Modal";
import { PolyAnimated } from "../brand/PolyAnimated";
import { careerLoopApi } from "../../api";
import { SubscriptionTier } from "../../types";
import { useToast } from "../common/Toast";

interface Props {
  resumeId: string;
  resumeSlug: string;
  subscriptionTier: SubscriptionTier;
  onClose: () => void;
}

/**
 * "Full Circle" — the one-time post-publish modal, shown right after
 * creating a resume (see ResumeEditPage's showLoopIntro effect). Earlier
 * versions of this modal (see docs/full-circle-coach-build-brief.md's
 * revision history) used a locked-step checklist look; this reuses the
 * exact same narrative "journey" ledger markup/classes as
 * ResumeLoopBadge.tsx's popover instead, so the introduction and the
 * ongoing per-resume badge speak the same visual language — nothing here
 * is ever shown as locked/greyed, an unmet step reads as an invitation.
 *
 * Doesn't fetch existing progress: this only ever renders immediately
 * after a brand-new resume is created, so Share/Track/Letters are always
 * false at that point by construction.
 */
export function CareerLoopIntroModal({ resumeId, resumeSlug, subscriptionTier, onClose }: Props) {
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

  return (
    <Modal title="Your career loop is live" onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "-4px 0 16px" }}>
        <PolyAnimated expression="celebrate" size={44} decorative />
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
          Nice — this resume's journey starts now.
        </p>
      </div>

      <p className="resume-loop-popover-title" style={{ margin: "0 0 10px" }}>
        This resume's journey
      </p>
      <div className="resume-loop-ledger" style={{ marginBottom: 18 }}>
        <div className="resume-loop-ledger-row is-done">
          <span className="resume-loop-ledger-check">✓</span>
          <span>Published just now</span>
        </div>
        <div className={`resume-loop-ledger-row ${shared ? "is-done" : ""}`}>
          <span className="resume-loop-ledger-check">{shared ? "✓" : ""}</span>
          {shared ? (
            <span>Shared</span>
          ) : (
            <button className="resume-loop-ledger-action" onClick={copyLink} disabled={busy}>
              Copy link to share
            </button>
          )}
        </div>
        <div className="resume-loop-ledger-row">
          <span className="resume-loop-ledger-check" />
          {trackLocked ? (
            <span className="resume-loop-ledger-invite">
              Add tracking to this resume's story <span className="resume-loop-tag">Pro+</span>
            </span>
          ) : (
            <Link to="/job-applications" className="resume-loop-ledger-action" onClick={onClose}>
              Log an application
            </Link>
          )}
        </div>
        <div className="resume-loop-ledger-row">
          <span className="resume-loop-ledger-check" />
          {lettersLocked ? (
            <span className="resume-loop-ledger-invite">
              Add a letter to this resume's story <span className="resume-loop-tag">Premium</span>
            </span>
          ) : (
            <Link to="/cover-letter" className="resume-loop-ledger-action" onClick={onClose}>
              Write a cover letter
            </Link>
          )}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>
        Find this resume's journey any time from its badge on your dashboard.
      </p>
    </Modal>
  );
}
