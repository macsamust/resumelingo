import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { adminApi, ApiError } from "../../api";
import { AdminPlanGridSkeleton } from "../../components/admin/AdminPlanGridSkeleton";
import { AdminPlan } from "../../types";

interface DraftPlan {
  name: string;
  priceMonthly: string;
  resumeLimit: string;
  featuresText: string; // one feature per line, textarea-friendly
}

function toDraft(plan: AdminPlan): DraftPlan {
  return {
    name: plan.name,
    priceMonthly: String(plan.priceMonthly),
    resumeLimit: String(plan.resumeLimit),
    featuresText: plan.features.join("\n"),
  };
}

export function AdminPlansPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftPlan>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [savedTier, setSavedTier] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listPlans()
      .then((res) => {
        setPlans(res.plans);
        const nextDrafts: Record<string, DraftPlan> = {};
        res.plans.forEach((p) => (nextDrafts[p.tier] = toDraft(p)));
        setDrafts(nextDrafts);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load plans."))
      .finally(() => setLoading(false));
  }, []);

  const updateDraft = (tier: string, patch: Partial<DraftPlan>) => {
    setDrafts((prev) => ({ ...prev, [tier]: { ...prev[tier], ...patch } }));
  };

  const onSave = async (tier: string, e: FormEvent) => {
    e.preventDefault();
    const draft = drafts[tier];
    setSavingTier(tier);
    setSavedTier(null);
    setError(null);
    try {
      const { plan } = await adminApi.updatePlan(tier, {
        name: draft.name,
        priceMonthly: Number(draft.priceMonthly),
        resumeLimit: Number(draft.resumeLimit),
        features: draft.featuresText.split("\n").map((f) => f.trim()).filter(Boolean),
      });
      setPlans((prev) => prev.map((p) => (p.tier === tier ? plan : p)));
      setDrafts((prev) => ({ ...prev, [tier]: toDraft(plan) }));
      setSavedTier(tier);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this plan.");
    } finally {
      setSavingTier(null);
    }
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>Plans & Pricing</h1>
      </div>
      <p className="hero-note admin-plan-warning">
        Editing a plan here changes what's displayed on the pricing page and dashboard. It does not change what
        Stripe actually charges. To change the real billed amount for Professional or Premium, update the Price in
        the Stripe dashboard (and the STRIPE_PRICE_* env var if you create a new Price).
      </p>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <AdminPlanGridSkeleton />
      ) : (
        <div className="admin-plan-grid">
          {plans.map((plan) => {
            const draft = drafts[plan.tier];
            if (!draft) return null;
            return (
              <form key={plan.tier} className="admin-plan-card" onSubmit={(e) => onSave(plan.tier, e)}>
                <h2 className="admin-plan-tier">{plan.tier}</h2>
                <div className="field">
                  <label>Display name</label>
                  <input value={draft.name} onChange={(e) => updateDraft(plan.tier, { name: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Price / month (USD)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.priceMonthly}
                    onChange={(e) => updateDraft(plan.tier, { priceMonthly: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Resume limit (-1 = unlimited)</label>
                  <input
                    type="number"
                    min={-1}
                    step="1"
                    value={draft.resumeLimit}
                    onChange={(e) => updateDraft(plan.tier, { resumeLimit: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Features (one per line)</label>
                  <textarea
                    rows={8}
                    value={draft.featuresText}
                    onChange={(e) => updateDraft(plan.tier, { featuresText: e.target.value })}
                  />
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={savingTier === plan.tier}>
                  {savingTier === plan.tier ? "Saving…" : "Save changes"}
                </button>
                {savedTier === plan.tier && <p className="admin-save-confirm">Saved.</p>}
              </form>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
