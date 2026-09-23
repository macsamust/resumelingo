# ResumeLingo — Security Incident & Breach Response Playbook

Sep 23, 2026 · CJ Owens

## Purpose & Scope

This playbook defines what happens in the hours and days after ResumeLingo discovers, or suspects, that something has gone wrong from a security standpoint — unauthorized access, exposed data, a compromised credential, or anything in between. It exists because a plan written during a calm afternoon is far more likely to be followed than one improvised during an actual incident, and because this is one of the few items from the Sep 22 security/compliance review that's genuinely required before scale rather than a nice-to-have.

**Security incident vs. breach:** not every incident is a breach. An *incident* is any event that could compromise confidentiality, integrity, or availability — a suspicious login pattern, a mass-delete by a compromised admin account, a dependency vulnerability. A *breach* is the subset that actually resulted in unauthorized access to, or disclosure of, personal data (names, emails, resume content, subscription/billing data). This distinction matters because breaches carry legal notification obligations (Section 4); incidents that don't rise to that level still get contained and reviewed, just without the regulatory clock.

**Scope:** covers ResumeLingo's own systems (the D1 database, Cloudflare Workers application, admin panel) and the data within them. It does not replace Stripe's or Cloudflare's own incident response for their infrastructure — both are subprocessors with their own breach-notification obligations to ResumeLingo as their customer, which this playbook's Section 4 accounts for rather than duplicates.

## Roles & Decision Authority

With a single developer, the goal isn't an org chart — it's making sure the two decisions that actually matter ("is this a breach?" and "who do we tell?") aren't stuck waiting on one person who might be unreachable.

- **Incident owner (you):** the default decision-maker. Determines severity, decides whether the incident rises to a notifiable breach, and executes containment and notification.
- **Backup decision-maker:** the same trusted backup contact named in the Backup, Continuity & Disaster Recovery Plan (`docs/ops/Backup-Continuity-Disaster-Recovery-Plan.md`). If you're unreachable during an active incident, they have enough access (per that plan's Section 6) to at minimum contain the immediate exposure — revoke compromised credentials, take the affected feature offline — even without full context, and to escalate to legal/counsel if the situation calls for it.
- **Who gets looped in, and when:** legal counsel before any external notification is sent (breach notification law is jurisdiction-specific and this playbook is not a substitute for that review); any co-founder or business partner immediately upon confirming a breach, not after remediation.
- **No formal on-call rotation today** — that's an explicit deferral (see Section 7) until a second team member joins, not an oversight.

## Detection: What Already Alerts You

This is better-covered than a from-scratch playbook usually assumes — ResumeLingo already has real detection infrastructure, not just this document:

- **Real-time critical alerts:** `SecurityAlertService.recordIfNew()` fires an immediate email to every admin account (falling back to `env.ADMIN_EMAIL`) the moment a `critical`-severity event is logged, deduplicated per IP so a sustained attack sends one email per burst, not one per blocked request. This already covers throttled abuse on login, registration, email verification/resend, password reset, and public resume password attempts.
- **Daily digest + retrospective scan:** `SecurityMonitorService.runDailyCheck()` runs once a day and does two things — rolls the last 24h of `security_events` (everything at warning/info severity, since criticals already alerted immediately) into one digest email, and separately scans the never-pruned `admin_audit_log` for any admin who's crossed a mass-delete threshold (20+ delete-type actions in 24h) that hasn't already been flagged.
- **Admin audit trail:** every admin action (including this job's own automatic suspend/delete actions) is written to `admin_audit_log`, giving a durable record to review during triage — not just for the specific anomaly this job checks for, but for reconstructing what happened during any incident involving admin access.

**Known, documented gap** (from `SecurityMonitorService`'s own code comments): a "slow-drip" pattern that stays just under each individual throttle threshold, spread out over many hours, would not currently be caught — the IP-throttle tables are pruned within their own short window rather than retained for a full day. This is a deliberate, stated tradeoff (retaining those rows longer would grow the tables for no throttling benefit) rather than an oversight, but it's the honest answer to "what wouldn't we catch."

**What has no automated detection today:** a compromised Cloudflare or Stripe account itself (would need to be noticed via unexpected dashboard activity, an unexpected email from either provider, or a user report), and a data exposure that doesn't touch any of the monitored abuse-prone endpoints (e.g. a misconfigured access control letting one user see another's data) — these rely on user reports, manual review, or luck until/unless broader anomaly detection is built.

## Severity Classification & Notification Clock

**This section is research, not legal advice** — confirm actual notification obligations with counsel once an incident is real; the clocks below are what to be aware of, not a substitute for that review.

| Severity | Definition | Example | Notification obligation |
|---|---|---|---|
| **Low** | Contained, no data exposure | A blocked brute-force attempt, a caught-and-patched dependency vulnerability with no evidence of exploitation | None externally; log and review internally |
| **Medium** | Possible exposure, unconfirmed or narrow | A single admin account showing anomalous behavior, a bug that could theoretically leak data but no evidence it was exploited | Internal escalation to counsel to assess; no external notification unless assessment confirms exposure |
| **High** | Confirmed unauthorized access or data exposure, limited scope | One user's resume data or PII exposed to another user via an access-control bug | Likely triggers notification obligations — see clocks below |
| **Critical** | Confirmed breach, broad scope or sensitive data (payment/billing data, credentials, large user count) | Database-wide unauthorized access, credential compromise affecting many accounts | Notification obligations apply; also assess business-continuity impact alongside the Backup/DR plan |

**Legal clocks to be aware of:**
- **GDPR** (if EU/UK users are affected): notify the relevant supervisory authority within **72 hours** of becoming aware of a breach likely to result in risk to individuals; notify affected individuals directly if the risk is high.
- **US state laws** (CCPA/CPRA and others): notification timing varies by state — "without unreasonable delay" is the common standard, with some states specifying a maximum number of days. Determine which states' residents are affected before finalizing a notification timeline.
- **Stripe and Cloudflare as subprocessors:** each has its own breach-notification obligations to ResumeLingo as their customer under their respective terms/DPAs. If either reports an incident to you, that starts your own clock for assessing whether it affects ResumeLingo's users — confirm their notification channel (usually account email + status page) is one you'd actually see promptly.

## Step-by-Step Incident Response Procedure

**1. Detect & triage**
- Confirm the signal is real (check `security_events`, `admin_audit_log`, the daily digest, or the report source — user, Stripe, Cloudflare).
- Classify severity using Section 4's table. When in doubt, classify one level higher until assessed further.

**2. Contain**
- Revoke the specific credential or session involved (rotate the admin's password + TOTP secret per the DR plan's admin-compromise runbook; force-expire refresh tokens for an affected user cohort if applicable).
- If the exposure is from a code bug, ship the fix or take the affected endpoint offline rather than leaving it live while investigating.
- Rotate any secret that may have been exposed (Stripe keys, JWT signing secret, AI provider keys) — same step as the DR plan's Cloudflare-compromise runbook.

**3. Assess scope**
- Determine what data was actually accessible: which tables, which users, what time window. `admin_audit_log` and D1 Time Travel (to inspect state at a prior point) are the primary tools here.
- Determine whether this rises to a notifiable breach per Section 4.

**4. Notify**
- Internal: counsel and any co-founder/partner, immediately upon confirming scope (Section 2).
- External (if notifiable): affected users, and the relevant regulator if the GDPR/state-law thresholds in Section 4 apply. Use the templates in Section 6 as a starting draft, not a final copy — counsel reviews before anything goes out.

**5. Remediate**
- Fix the root cause, not just the symptom — if it was a code bug, add a regression test; if it was a credential compromise, confirm the new credential is stored correctly (password manager, not `.env`).
- Confirm the fix with the same verification rigor as any other change (tests, typecheck, and for anything security-relevant, a second look before deploying).

**6. Review**
- See Section 7 — every incident gets a post-incident review, whether or not it became a notifiable breach.

## Notification Templates

Starting drafts only — counsel reviews and edits before anything external goes out; these exist so an actual incident doesn't start from a blank page.

**Internal escalation note** (to counsel / co-founder):

> Subject: [SEVERITY] Security incident — ResumeLingo — [date]
>
> What happened: [one paragraph, factual, no speculation]
> When detected / when it occurred (if different): [timestamps]
> Data potentially affected: [tables, user count estimate, data types]
> Containment status: [what's been done so far]
> Current assessment: [does this look notifiable per Section 4, and why]
> Next steps / what's needed from you: [specific ask]

**Draft user-facing breach notification** (subject to counsel review, jurisdiction-specific legal requirements, and adjustment to the actual incident):

> Subject: Important security notice about your ResumeLingo account
>
> We're writing to let you know about a security incident that may have affected your ResumeLingo account.
>
> **What happened:** [plain-language, factual description]
> **What information was involved:** [specific data types — avoid vague language]
> **What we've done:** [containment and remediation steps already taken]
> **What we recommend you do:** [e.g. reset your password, review your account activity, watch for phishing attempts referencing this incident]
> **Where to get more information:** [contact method]
>
> We take the security of your information seriously and are continuing to review our systems to prevent this from happening again.

This draft deliberately avoids minimizing language ("a small number of", "limited exposure") unless that framing is both accurate and something counsel is comfortable with — regulators and users tend to react worse to notifications that later prove to have understated scope than to ones that were direct from the start.

## Post-Incident Review & Roadmap

Every incident — notifiable breach or not — gets a short written review once it's resolved: what happened, what the detection gap was (if any), what changed as a result, and whether this playbook itself needs updating. Skipping this for "minor" incidents is how the same gap gets rediscovered later.

**Where this playbook is intentionally light today, and its trigger to expand:**
- **No formal on-call rotation:** fine for a single developer; revisit when a second team member joins, same trigger as the Backup/DR plan's roadmap.
- **No cyber insurance or breach-response vendor on retainer:** worth evaluating once real payment volume or user count makes a large-scale breach financially material, not before.
- **The "slow-drip" detection gap** (Section 3): worth closing if abuse patterns actually start appearing near that threshold — not worth the table growth cost speculatively.
- **Annual review**, same cadence as the Backup/DR plan's full review, and immediately after any real incident regardless of severity.
