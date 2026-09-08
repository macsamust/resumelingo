import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";

/**
 * Reached from the "Verify email address" link in
 * AuthService.sendVerificationEmail. Unlike UnsubscribePage, this fires
 * automatically on load rather than waiting for a button click — an email
 * security scanner prefetching the link just verifies the address a little
 * early, which isn't a harmful outcome the way an unwanted auto-unsubscribe
 * would be, so the extra click-to-confirm friction isn't needed here.
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { refresh } = useAuth();
  const [status, setStatus] = useState<"pending" | "done" | "error">("pending");
  const [error, setError] = useState<string | null>(null);
  // Guards against React StrictMode's dev-only double-invoke of effects
  // (never happens in a production build). Without this, the verify call
  // fires twice locally: the first succeeds and consumes the single-use
  // token server-side, the second immediately fires with that now-already-
  // used token and gets rejected as invalid — whichever response lands last
  // wins, so a genuinely successful verification could still show an error.
  // Found via a real local-dev repro (Sep 2026): the database showed
  // emailVerified already true while the page displayed "invalid or
  // expired."
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    if (!token) {
      setStatus("error");
      setError("This verification link is missing its token. Please use the link from your email.");
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus("done");
        // Picks up the now-true emailVerified flag if this browser also
        // happens to be logged in, so AppShell's banner disappears without
        // needing a manual refresh.
        refresh();
      })
      .catch((err) => {
        setStatus("error");
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Verify your email</h1>
        {status === "pending" && <p className="sub">Confirming your email address…</p>}
        {status === "done" && <p className="sub">Your email address is verified.</p>}
        {status === "error" && error && <div className="form-error">{error}</div>}
        <p className="form-footnote">
          <Link to="/dashboard">Go to your dashboard</Link>
        </p>
      </div>
    </div>
  );
}
