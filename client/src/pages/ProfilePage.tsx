import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "../components/layout/AppShell";
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

  const onToggleDigest = async (checked: boolean) => {
    setDigestError(null);
    setSavingDigest(true);
    try {
      const { user: updated } = await authApi.updateEmailPreferences({ viewDigestOptOut: !checked });
      updateUser(updated);
    } catch (err) {
      setDigestError(err instanceof ApiError ? err.message : "Something went wrong saving your email preferences.");
    } finally {
      setSavingDigest(false);
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
          <div className="field">
            <label>Subscription plan</label>
            <input value={user.plan.name} disabled />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      <div className="builder-panel" style={{ maxWidth: 520 }}>
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

      {(user.subscriptionTier === "professional" || user.subscriptionTier === "premium") && (
        <div className="builder-panel" style={{ maxWidth: 520, marginTop: 28 }}>
          <h2>Email preferences</h2>
          {digestError && <div className="form-error">{digestError}</div>}
          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={!user.viewDigestOptOut}
              disabled={savingDigest}
              onChange={(e) => onToggleDigest(e.target.checked)}
            />
            <span>Weekly resume view digest — a Monday summary of how many views your resumes got that week.</span>
          </label>
        </div>
      )}
    </AppShell>
  );
}
