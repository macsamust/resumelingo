import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi, ApiError } from "../api";

/**
 * Reached from the "Unsubscribe" link in either ViewDigestService's weekly
 * digest email or ResumeRefreshNudgeService's nudge email — deliberately not
 * logged-in (mirrors ResetPasswordPage's pattern of reading a token from the
 * query string). Unsubscribing requires an explicit button click here rather
 * than firing automatically on page load, so an email security scanner
 * prefetching the link can't silently unsubscribe the user on their behalf.
 *
 * Both emails post to the same /auth/unsubscribe-digest endpoint with the
 * same token shape (see UnsubscribeDigestTokenPayload's doc comment) — the
 * server decides which preference actually gets flipped based on the
 * token's own embedded purpose. The `type` query param here is purely
 * cosmetic (which heading/copy to show); it isn't sent to the server and
 * has no effect on what actually gets unsubscribed.
 */
export function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const isRefreshNudge = searchParams.get("type") === "refresh";
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onUnsubscribe = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await authApi.unsubscribeDigest(token);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Unsubscribe</h1>
          <div className="form-error">This unsubscribe link is missing its token. Please use the link from your email.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{isRefreshNudge ? "AI Resume Refresh nudge" : "Weekly resume digest"}</h1>
        {done ? (
          <p className="sub">
            {isRefreshNudge
              ? "You've been unsubscribed from the AI Resume Refresh nudge. You can reenable it anytime from your Profile page."
              : "You've been unsubscribed from the weekly resume view digest. You can reenable it anytime from your Profile page."}
          </p>
        ) : (
          <>
            <p className="sub">
              {isRefreshNudge
                ? "Stop receiving check-in emails about resumes that have gone quiet?"
                : "Stop receiving the weekly email summarizing views on your resumes?"}
            </p>
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-primary btn-block" onClick={onUnsubscribe} disabled={submitting}>
              {submitting ? "Unsubscribing…" : "Unsubscribe me"}
            </button>
          </>
        )}
        <p className="form-footnote">
          <Link to="/login">Back to ResumeLingo</Link>
        </p>
      </div>
    </div>
  );
}
