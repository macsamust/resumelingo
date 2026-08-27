import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { ApiError } from "../../api";

export function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  // Flips on when the server responds with reason: "totp_required" — the
  // password was correct, but the account has 2FA enabled and no (or an
  // invalid) code was given. Email/password stay filled in so the second
  // submit (with totpCode added) can go through without retyping them.
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password, totpRequired ? totpCode : undefined);
      navigate("/admin/users");
    } catch (err) {
      if (err instanceof ApiError && err.reason === "totp_required") {
        setTotpRequired(true);
        setError(null);
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Admin console</h1>
        <p className="sub">Sign in with an administrator account.</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={onSubmit}>
          {!totpRequired ? (
            <>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@resumelingo.app"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </>
          ) : (
            <div className="field">
              <label>Two-factor code</label>
              <p className="hero-note" style={{ marginBottom: 10 }}>
                Enter the 6-digit code from your authenticator app, or one of your backup codes.
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
              />
            </div>
          )}
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : totpRequired ? "Verify" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
