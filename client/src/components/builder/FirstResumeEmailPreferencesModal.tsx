import { useState } from "react";
import { Modal } from "../common/Modal";
import { useAuth } from "../../context/AuthContext";
import { authApi, ApiError } from "../../api";
import { PolyAvatar } from "../brand/PolyAvatar";

interface Props {
  onClose: () => void;
}

/**
 * Shown once, right after a Professional/Premium subscriber's *first*
 * resume is successfully created (see ResumeBuilderPage's onSubmit) — not a
 * gate before creation, just a one-time nudge afterward so new subscribers
 * know these two email preferences exist without having to stumble onto
 * Profile's "Email preferences" section on their own. Reads/writes the same
 * fields as that section (see AuthController.updateEmailPreferences) —
 * there's no separate "seen this prompt" flag; a subscriber only ever sees
 * it because ResumeBuilderPage checked their resume count was zero before
 * this create, so it can never resurface on their 2nd+ resume.
 *
 * Both settings default to their normal opted-in values (see migrations
 * 0016/0037) whether or not this modal ever appears, so skipping it changes
 * nothing — it's purely a chance to opt out or adjust cadence early instead
 * of only discovering these exist by digging through Profile later.
 */
export function FirstResumeEmailPreferencesModal({ onClose }: Props) {
  const { user, updateUser } = useAuth();
  const [viewDigestOptOut, setViewDigestOptOut] = useState(user?.viewDigestOptOut ?? false);
  const [resumeRefreshOptOut, setResumeRefreshOptOut] = useState(user?.resumeRefreshOptOut ?? false);
  const [resumeRefreshCadenceDays, setResumeRefreshCadenceDays] = useState(user?.resumeRefreshCadenceDays ?? 120);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const { user: updated } = await authApi.updateEmailPreferences({
        viewDigestOptOut,
        resumeRefreshOptOut,
        resumeRefreshCadenceDays,
      });
      updateUser(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong saving your email preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Stay in the loop?" onClose={onClose} disableDismiss={saving}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        <PolyAvatar size={64} decorative />
      </div>
      <p className="modal-message">
        Nice work on your first resume! Here are two optional emails you can turn on or off now — you can always
        change this later from your Profile page.
      </p>
      {error && <div className="form-error">{error}</div>}

      <div className="field">
        <label style={{ marginBottom: 4 }}>Weekly resume view digest</label>
        <p className="hero-note" style={{ marginTop: 0, marginBottom: 8 }}>
          A Monday summary of how many views your resumes got that week.
        </p>
        <label className="checkbox-field" style={{ display: "flex", alignItems: "center", margin: "4px 0 0", gap: 24 }}>
          <input
            type="checkbox"
            checked={!viewDigestOptOut}
            disabled={saving}
            onChange={(e) => setViewDigestOptOut(!e.target.checked)}
          />
          <span className="hero-note" style={{ margin: 0 }}>Send me the weekly digest</span>
        </label>
      </div>

      <div className="field" style={{ marginTop: 20 }}>
        <label style={{ marginBottom: 4 }}>AI Resume Refresh nudge</label>
        <p className="hero-note" style={{ marginTop: 0, marginBottom: 8 }}>
          If a resume goes quiet, we'll check in and offer a couple of keywords worth considering for your role — no
          login needed to act on it from the email.
        </p>
        <label className="checkbox-field" style={{ display: "flex", alignItems: "center", margin: "4px 0 10px", gap: 24 }}>
          <input
            type="checkbox"
            checked={!resumeRefreshOptOut}
            disabled={saving}
            onChange={(e) => setResumeRefreshOptOut(!e.target.checked)}
          />
          <span className="hero-note" style={{ margin: 0 }}>Send me the refresh nudge</span>
        </label>
        <select
          value={resumeRefreshCadenceDays}
          disabled={saving || resumeRefreshOptOut}
          onChange={(e) => setResumeRefreshCadenceDays(Number(e.target.value))}
          style={{ maxWidth: 220 }}
        >
          <option value={60}>Check in every 60 days</option>
          <option value={120}>Check in every 120 days</option>
          <option value={360}>Check in every 360 days</option>
        </select>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
          Skip for now
        </button>
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </Modal>
  );
}
