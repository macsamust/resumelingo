import { Link } from "react-router-dom";
import { Modal } from "../common/Modal";
import { SubscriptionPlan, SubscriptionTier } from "../../types";
import { TIER_LABEL } from "../../utils/templateAccess";

interface Props {
  templateName: string;
  tier: SubscriptionTier;
  plans: SubscriptionPlan[];
  onClose: () => void;
}

/**
 * Shown when someone clicks a template pill their plan can't use (Sep 2026
 * QA pass — see TODO.md's "Locked template click" entry). Previously that
 * click was a true no-op: the only feedback was a passive tooltip and a
 * lock icon, neither of which fires on click, so nothing happened at all.
 * Used by both ResumeEditPage.tsx and ResumeBuilderPage.tsx's template
 * pickers, which have identical locked-template logic (canUseTemplate/
 * CATEGORY_MIN_TIER in utils/templateAccess.ts) but are otherwise separate
 * pages — a shared component keeps the two from drifting apart the way the
 * two pickers' onClick handlers themselves already had.
 *
 * "Upgrade my plan" links to /dashboard rather than initiating checkout
 * directly, matching every other locked-feature CTA in the app
 * (ThankYouLetterLocked, CoverLetterLocked, CareerCenterPage,
 * CareerCoachPage, JobApplicationsPage) — the actual upgrade/checkout flow
 * lives on the dashboard, not duplicated at each call site.
 */
export function TemplateUpgradeModal({ templateName, tier, plans, onClose }: Props) {
  const price = plans.find((p) => p.tier === tier)?.priceMonthly;

  return (
    <Modal title={`Unlock ${templateName}`} onClose={onClose}>
      <p className="modal-message">
        {templateName} is a {TIER_LABEL[tier]} template
        {typeof price === "number"
          ? ` — available on the ${TIER_LABEL[tier]} plan ($${price.toFixed(2)}/mo).`
          : `, available on the ${TIER_LABEL[tier]} plan.`}
      </p>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Maybe later
        </button>
        <Link to="/dashboard" className="btn btn-primary" onClick={onClose}>
          Upgrade my plan
        </Link>
      </div>
    </Modal>
  );
}
