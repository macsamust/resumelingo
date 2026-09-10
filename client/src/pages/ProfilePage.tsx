import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { ApiError, authApi, catalogApi } from "../api";
import { ProfessionSummary } from "../types";

/**
 * Lets the account holder see and edit their own details (name, email,
 * profession) and change their password. Separate from subscription/billing
 * (see DashboardPage's "Manage billing" button, which goes through Stripe).
 */
export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [professions, setProfessions] = useState<ProfessionSummary[]>([]);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profession, setProfession] = useState(user?.profession ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [digestError, setDigestError] = useState<string | null>(null);
  const [savingDigest, setSavingDigest] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [resumingSubscription, setResumingSubscription] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  useEffect(() => {
    catalogApi.listProfessions().then((res) => setProfessions(res.professions)).catch(() => setProfessions([]));
  }, []);

  const onSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setSavingProfile(true);
    try {
      const { user: updated } = await authApi.updateProfile({ name, email, profession: profession || null });
      updateUser(updated);
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "Something went wrong saving your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordSuccess(true);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Something went wrong changing your password.");
    } finally {
      setSavingPassword(false);
    }
  };

  // All three preferences below save through the same PUT
  // /auth/me/email-preferences call (see AuthController.updateEmailPreferences),
  // so changing any one sends the *others'* current values along unchanged
  // rather than needing three separate endpoints for settings that live in
  // one panel.
  const saveEmailPreferences = async (overrides: {
    viewDigestOptOut?: boolean;
    resumeRefreshOptOut?: boolean;
    resumeRefreshCadenceDays?: number;
  }) => {
    if (!user) return;
    setDigestError(null);
    setSavingDigest(true);
    try {
      const { user: updated } = await authApi.updateEmailPreferences({
        viewDigestOptOut: overrides.viewDigestOptOut ?? user.viewDigestOptOut,
        resumeRefreshOptOut: overrides.resumeRefreshOptOut ?? user.resumeRefreshOptOut,
        resumeRefreshCadenceDays: overrides.resumeRefreshCadenceDays ?? user.resumeRefreshCadenceDays,
      });
      updateUser(updated);
    } catch (err) {
      setDigestError(err instanceof ApiError ? err.message : "Something went wrong saving your email preferences.");
    } finally {
      setSavingDigest(false);
    }
  };

  const onToggleDigest = (checked: boolean) => saveEmailPreferences({ viewDigestOptOut: !checked });
  const onToggleRefresh = (checked: boolean) => saveEmailPreferences({ resumeRefreshOptOut: !checked });
  const onChangeRefreshCadence = (days: number) => saveEmailPreferences({ resumeRefreshCadenceDays: days });

  const onCancelSubscription = async () => {
    setCancelError(null);
    try {
      const { user: updated } = await catalogApi.cancelSubscription();
      updateUser(updated);
      setShowCancelConfirm(false);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Something went wrong cancelling your subscription.");
    }
  };

  const onResumeSubscription = async () => {
    setResumeError(null);
    setResumingSubscription(true);
    try {
      const { user: updated } = await catalogApi.resumeSubscription();
      updateUser(updated);
    } catch (err) {
      setResumeError(err instanceof ApiError ? err.message : "Something went wrong resuming your subscription.");
    } finally {
      setResumingSubscription(false);
    }
  };

  if (!user) return null; // ProtectedRoute guarantees this, but keeps TS happy below

  return (
    <AppShell>
      <div className="app-page-head">
        <h1>Profile</h1>
      </div>

      <div className="builder-panel" style={{ maxWidth: 520, marginBottom: 28 }}>
        <h2>Your details</h2>
        {profileError && <div className="form-error">{profileError}</div>}
        {profileSuccess && <div className="empty-state">Profile updated.</div>}
        <form onSubmit={onSaveProfile}>
          <div className="field">
            <label>Full name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Profession</label>
            <select value={profession ?? ""} onChange={(e) => setProfession(e.target.value)}>
              <option value="">Select a profession…</option>
              {professions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      <div className="builder-panel" style={{ maxWidth: 520, marginBottom: 28 }}>
        <h2>Change password</h2>
        {passwordError && <div className="form-error">{passwordError}</div>}
        {passwordSuccess && <div className="empty-state">Password changed.</div>}
        <form onSubmit={onChangePassword}>
          <div className="field">
            <label>Current password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label>New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={savingPassword}>
            {savingPassword ? "Changing…" : "Change password"}
          </button>
        </form>
      </div>

      <div className="builder-panel" style={{ maxWidth: 520, marginBottom: 28 }}>
        <h2>Subscription</h2>
        <div className="field">
          <label>Subscription plan</label>
          <input value={user.plan.name} disabled />
        </div>
        {user.subscriptionTier === "starter" && (
          <>
            <p className="modal-message">Upgrade for more resumes, premium templates, and AI-assisted tools.</p>
            <Link to="/#pricing" className="btn btn-primary btn-block">
              Upgrade plan
            </Link>
          </>
        )}
        {(user.subscriptionTier === "professional" || user.subscriptionTier === "premium") && (
          <>
            {cancelError && <div className="form-error">{cancelError}</div>}
            {resumeError && <div className="form-error">{resumeError}</div>}
            {user.cancelAtPeriodEnd ? (
              <>
                <p className="modal-message">
                  Your subscription is set to cancel
                  {user.currentPeriodEnd ? ` on ${new Date(user.currentPeriodEnd).toLocaleDateString()}` : " at the end of the current billing period"}.
                  You'll keep {user.plan.name} access until then.
                </p>
                <button className="btn btn-primary btn-block" onClick={onResumeSubscription} disabled={resumingSubscription}>
                  {resumingSubscription ? "Resuming…" : "Resume subscription"}
                </button>
              </>
            ) : (
              <>
                <p className="modal-message">
                  Billed monthly. Cancelling keeps your access through the end of the current billing period.
                </p>
                <button className="btn btn-ghost btn-block" onClick={() => setShowCancelConfirm(true)}>
                  Cancel subscription
                </button>
              </>
            )}
          </>
        )}
      </div>

      {(user.subscriptionTier === "professional" || user.subscriptionTier === "premium") && (
        <div className="builder-panel" style={{ maxWidth: 520, marginTop: 28 }}>
          <h2>Email preferences</h2>
          {digestError && <div className="form-error">{digestError}</div>}

          <div className="field">
            <label style={{ marginBottom: 4 }}>Weekly resume view digest</label>
            <p className="hero-note" style={{ marginTop: 0, marginBottom: 8 }}>
              A Monday summary of how many views your resumes got that week.
            </p>
            <label className="checkbox-field" style={{ display: "flex", alignItems: "center", margin: "4px 0 0", gap: 24 }}>
              <input
                type="checkbox"
                checked={!user.viewDigestOptOut}
                disabled={savingDigest}
                onChange={(e) => onToggleDigest(e.target.checked)}
              />
              <span className="hero-note" style={{ margin: 0 }}>Send me the weekly digest</span>
            </label>
          </div>

          <div className="field" style={{ marginTop: 20 }}>
            <label style={{ marginBottom: 4 }}>AI Resume Refresh nudge</label>
            <p className="hero-note" style={{ marginTop: 0, marginBottom: 8 }}>
              If a resume goes quiet, we'll check in and offer a couple of keywords worth considering for your
              role — no login needed to act on it from the email.
            </p>
            <label className="checkbox-field" style={{ display: "flex", alignItems: "center", margin: "4px 0 10px", gap: 24 }}>
              <input
                type="checkbox"
                checked={!user.resumeRefreshOptOut}
                disabled={savingDigest}
                onChange={(e) => onToggleRefresh(e.target.checked)}
              />
              <span className="hero-note" style={{ margin: 0 }}>Send me the refresh nudge</span>
            </label>
            <select
              value={user.resumeRefreshCadenceDays}
              disabled={savingDigest || user.resumeRefreshOptOut}
              onChange={(e) => onChangeRefreshCadence(Number(e.target.value))}
              style={{ maxWidth: 220 }}
            >
              <option value={60}>Check in every 60 days</option>
              <option value={120}>Check in every 120 days</option>
              <option value={360}>Check in every 360 days</option>
            </select>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <ConfirmDialog
          title="Cancel subscription"
          message={`You'll keep ${user.plan.name} access until the end of your current billing period, then your account moves to the free Starter plan. Continue?`}
          confirmLabel="Cancel subscription"
          danger
          onConfirm={onCancelSubscription}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
    </AppShell>
  );
}
