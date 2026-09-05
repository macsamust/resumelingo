import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { catalogApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { SubscriptionPlan } from "../../types";

const FALLBACK_PLANS: SubscriptionPlan[] = [
  { tier: "starter", name: "Starter", priceMonthly: 0, resumeLimit: 1, features: ["One resume", "Basic template", "PDF download", "Public link", "Limited edits", "Basic tips"] },
  { tier: "professional", name: "Professional", priceMonthly: 9.99, resumeLimit: 3, features: ["Three resumes", "Unlimited edits", "Template library", "Private sharing", "Analytics", "Resume scoring", "Career Center", "AI assistance", "Application Tracker"] },
  { tier: "premium", name: "Premium", priceMonthly: 19.99, resumeLimit: -1, features: ["Everything in Professional", "Unlimited resumes", "Premium templates", "Branded resume link", "Resume analytics", "Interview preparation", "Career coaching resources", "ATS optimization", "AI cover letters & thank-you letters", "AI Career Coach"] },
];

export function Pricing() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(FALLBACK_PLANS);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    catalogApi
      .listPlans()
      .then((res) => setPlans(res.plans))
      .catch(() => setPlans(FALLBACK_PLANS));
  }, []);

  const handleUpgrade = async (tier: "professional" | "premium") => {
    setCheckingOut(tier);
    try {
      const { url } = await catalogApi.checkout(tier);
      window.location.href = url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't start checkout. Please try again.");
      setCheckingOut(null);
    }
  };

  return (
    <section id="pricing">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">Pricing</span>
          <h2>Simple tiers that grow with your career</h2>
          <p>Start with one resume, upgrade when you need more.</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <div className={`price-card ${plan.tier === "professional" ? "featured" : ""}`} key={plan.tier}>
              {plan.tier === "professional" && <div className="price-ribbon">Most popular</div>}
              <div className="price-tier">{plan.name}</div>
              <h3>{plan.name}</h3>
              <div className="price-amount">
                {plan.priceMonthly === 0 ? "$0" : `$${plan.priceMonthly}`}
                {plan.priceMonthly > 0 && <span className="per">/month</span>}
              </div>
              <p className="price-desc">
                {plan.tier === "starter" && "Everything you need to get your first resume online."}
                {plan.tier === "professional" && "Ideal if you're targeting more than one role or field."}
                {plan.tier === "premium" && "Everything in Professional, plus the full platform."}
              </p>
              <ul className="price-list">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {plan.tier !== "starter" && user ? (
                user.subscriptionTier === plan.tier ? (
                  <button className="btn btn-block btn-ghost" disabled>
                    Current plan
                  </button>
                ) : (
                  <button
                    className={`btn btn-block ${plan.tier === "professional" ? "btn-primary" : "btn-ghost"}`}
                    disabled={checkingOut === plan.tier}
                    onClick={() => handleUpgrade(plan.tier as "professional" | "premium")}
                  >
                    {checkingOut === plan.tier
                      ? "Redirecting to checkout…"
                      : plan.tier === "professional"
                      ? "Upgrade to Professional"
                      : "Go Premium"}
                  </button>
                )
              ) : (
                <Link
                  to="/signup"
                  className={`btn btn-block ${plan.tier === "professional" ? "btn-primary" : "btn-ghost"}`}
                >
                  {plan.tier === "starter" ? "Start free" : plan.tier === "professional" ? "Upgrade to Professional" : "Go Premium"}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
