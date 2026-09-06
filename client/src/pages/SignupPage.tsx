import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError, catalogApi } from "../api";
import { ProfessionSummary, SubscriptionPlan } from "../types";

/** Only these two are ever worth carrying through signup — Starter needs no upgrade step, and anything else in the query param is ignored rather than trusted. */
const UPGRADABLE_TIERS = new Set(["professional", "premium"]);

export function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profession, setProfession] = useState("");
  const [professions, setProfessions] = useState<ProfessionSummary[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Set by Pricing.tsx's Professional/Premium CTAs (Sep 2026 QA pass — see
  // TODO.md's "Pricing CTAs preserve plan intent" entry) so clicking
  // "Upgrade to Professional" on the marketing page doesn't silently land
  // the new account on free Starter with no upgrade path.
  const requestedPlanParam = searchParams.get("plan");
  const requestedPlan = requestedPlanParam && UPGRADABLE_TIERS.has(requestedPlanParam) ? requestedPlanParam : null;
  const requestedPlanDetails = plans.find((p) => p.tier === requestedPlan);

  useEffect(() => {
    catalogApi.listProfessions().then((res) => setProfessions(res.professions)).catch(() => setProfessions([]));
    if (requestedPlan) catalogApi.listPlans().then((res) => setPlans(res.plans)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ name, email, password, profession: profession || undefined });
      if (requestedPlan) {
        // Straight into Stripe Checkout for the plan that was clicked on
        // the pricing page, rather than the dashboard — a checkout failure
        // here (Stripe misconfigured, network blip) shouldn't block an
        // otherwise-successful signup, so this falls back to the normal
        // welcome landing instead of surfacing an error on what the person
        // will read as an account-creation failure.
        try {
          const { url } = await catalogApi.checkout(requestedPlan as "professional" | "premium");
          window.location.href = url;
          return;
        } catch {
          navigate("/dashboard?welcome=1");
          return;
        }
      }
      // Distinguishes a brand-new account's first landing on the dashboard
      // from a returning user's — see DashboardPage's `welcome` query param,
      // which swaps "Welcome back" for "Welcome" when this is set.
      navigate("/dashboard?welcome=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create an account</h1>
        <p className="sub">Start free with one resume, upgrade anytime.</p>
        {requestedPlan && (
          <p className="hero-note" style={{ marginTop: -8, marginBottom: 14 }}>
            You'll be taken straight to checkout for{" "}
            <strong>{requestedPlanDetails ? requestedPlanDetails.name : requestedPlan}</strong>
            {requestedPlanDetails ? ` ($${requestedPlanDetails.priceMonthly}/month)` : ""} after you create your account.
          </p>
        )}
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Full name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div className="field">
            <label>Profession (optional)</label>
            <select value={profession} onChange={(e) => setProfession(e.target.value)}>
              <option value="">Select a profession…</option>
              {professions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? "Creating account…" : "Create an account"}
          </button>
        </form>
        <p className="hero-note" style={{ textAlign: "center", marginTop: 14 }}>
          By creating an account, you agree to our <Link to="/terms">Terms of Service</Link> and{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
        <p className="form-footnote">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
