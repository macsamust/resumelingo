# ResumeLingo — Backup, Continuity & Disaster Recovery Plan

Sep 23, 2026 · CJ Owens

## Purpose & Scope

This plan protects ResumeLingo's ability to keep operating against loss of code, configuration, infrastructure access, or data — and its ability to recover cleanly if any of those are damaged or destroyed.

**This supersedes the earlier draft of this plan**, which assumed a pre-launch stage with no database and no payment integration ("Database: Not yet provisioned," "Stripe (once added)"). That assumption doesn't match the codebase: ResumeLingo already has a live Cloudflare D1 database with 49+ applied migrations (users, resumes, subscriptions, job applications, admin audit logs), a fully wired Stripe integration (hosted Checkout, webhook signature verification, live/test-mode enforcement), and a deployed Cloudflare Workers + React application. Whether real paying customers are using it today or it's still deployed-but-test-only, the *infrastructure* is production-grade already — the backup and recovery plan needs to match that, not a hypothetical earlier stage.

**Goal:** no single lost laptop, deleted repo, expired account, departed collaborator, bad migration, or Cloudflare/Stripe incident should be able to destroy user data, take the app down for more than a defined window, or set the project back by more than a defined amount of work.

**Scope:** covers the application source code, the D1 database and its contents (user accounts, resumes, subscription/billing state, admin data), Cloudflare account and configuration, Stripe account and webhook configuration, secrets/credentials, the domain, and the people who hold access to all of the above. It does not cover Cloudflare's or Stripe's own internal infrastructure resilience — those are third-party dependencies this plan treats as generally reliable but not infallible (Section 4 covers what happens if they aren't).

## Asset Inventory

| Asset | Where it lives | Backed up today? |
|---|---|---|
| Application source code | Git repo | Yes, if pushed — confirm remote host and who has access |
| D1 database (users, resumes, subscriptions, job applications, admin audit log) | Cloudflare D1, bound in `wrangler.jsonc` | Cloudflare's platform durability + Time Travel (point-in-time recovery, ~30-day window by default) only — no scheduled export off Cloudflare, no tested restore |
| Deployment config (`wrangler.jsonc`, migrations, non-secret env vars) | Repo | Yes, if committed — confirm nothing environment-specific is only set by hand in the Cloudflare dashboard |
| Secrets & API keys (Stripe secret key, Stripe webhook secret, JWT signing secret, AI provider keys) | Cloudflare Workers secrets + local `.env` for dev | Cloudflare stores production secrets; confirm they're also in a password manager so losing dashboard access doesn't mean losing the values |
| Stripe account (customers, subscriptions, payment history, webhook config) | Stripe | Stripe retains this independently, but ResumeLingo's own mapping of `stripeCustomerId`/`stripeSubscriptionId` to users lives only in D1 |
| Cloudflare account (Workers, D1, DNS, Pages/hosting) | Cloudflare | Covered by their infra; account access itself is a single point of failure |
| Domain registration | Registrar account | ? — confirm auto-renew and current payment method |
| Admin accounts (TOTP-protected) | D1 `admins` table + authenticator apps | Same backup story as the rest of D1; losing all admin TOTP devices simultaneously has no documented recovery path today |
| Product/design docs, this plan | Docs tool / notes | Continuous auto-save via the provider |

**Open questions to resolve:** Where does the canonical repo live, is it private, and who besides you has push access? Are Stripe and AI-provider secrets stored anywhere other than Cloudflare's secret store (i.e. in a password manager, so dashboard lockout doesn't mean key loss)? Is there more than one Cloudflare account owner/admin so account recovery doesn't depend on one person?

## Backup Strategy

| What | How | Frequency | Where it lands |
|---|---|---|---|
| Source code | Git commits pushed to a remote | Every work session, minimum daily | Remote host (already geographically redundant) |
| Deployment config & migrations | Committed to the repo alongside code | Same as code | Same repo |
| **D1 database** | Two layers: (1) Cloudflare D1 Time Travel, automatic, no setup — covers accidental deletes/bad migrations within its retention window; (2) a scheduled export (`wrangler d1 export`) run on a cron/CI job, written to an off-Cloudflare location (e.g. R2 in a different account, or S3/GCS) — covers the case where the Cloudflare account itself is compromised or suspended, which Time Travel alone does not | Time Travel: continuous. Scheduled export: daily | Cloudflare (Time Travel) + an independent off-platform store (scheduled export) |
| Secrets & API keys | Cloudflare Workers secrets for production; mirrored into a password manager vault (1Password/Bitwarden), never committed to git | On creation/rotation | Cloudflare secrets store + password manager's encrypted cloud storage |
| Stripe data | Stripe retains its own transaction/subscription history independently. ResumeLingo's mapping (which user owns which `stripeCustomerId`) is protected by the D1 backup above, not separately | N/A (covered by D1 backup) | Stripe's own infra + D1 backup |
| Domain & account credentials | Password manager, with 2FA backup codes stored alongside | On setup | Password manager |
| Product/design docs | Cloud-synced docs tool rather than local-only files | Continuous (auto-save) | Provider's cloud |

**The one rule that matters most:** nothing important should exist in only one place. Specifically: the D1 database should not depend solely on Cloudflare's own Time Travel — that protects against your mistakes (bad migration, accidental delete) but not against a Cloudflare-account-level problem (lockout, suspension, billing dispute) taking Time Travel down with everything else. A scheduled off-platform export is the gap this closes, and it's the single highest-value addition to this plan given the current setup.

## Recovery Objectives & Scenarios

Because a real D1 database with user accounts and subscription/billing state already exists, objectives need to be set in minutes-to-hours, not the "a day of work" framing that fit a pre-database stage.

- **Recovery Point Objective (RPO) — target: 24 hours for the database**, tightening to 1 hour once real payment volume justifies more frequent scheduled exports (D1 Time Travel itself has effectively continuous granularity within its retention window for the "undo a mistake" case).
- **Recovery Time Objective (RTO) — target: a few hours** to restore database access after an incident; **under 1 hour** to redeploy the application from the repo to a working Cloudflare Workers environment, since that path has no unknowns (clone, install, `wrangler deploy`).

| Scenario | Likelihood | Impact today | Recovery path |
|---|---|---|---|
| Accidental data deletion or bad migration | Medium | High — real user/subscription data | D1 Time Travel restore to just before the incident |
| Laptop lost/stolen/dies | Medium | Low if code is pushed and secrets are in a password manager | Clone repo on new machine, restore secrets, redeploy |
| Cloudflare account compromised, suspended, or locked out | Low | Severe — database, DNS, and hosting all live there | Account recovery via 2FA backup codes; if data itself is affected, restore from the off-platform D1 export (Time Travel won't help if the account itself is the problem) |
| Stripe account incident or webhook misconfiguration | Low | Medium — billing state could drift from what D1 records | Reconcile D1 subscription state against Stripe's dashboard/API as source of truth; Stripe retains full history independently |
| Compromised or lost admin credentials (TOTP device lost) | Low–Medium | Medium–High — admin panel has broad access (user management, plan pricing) | Rotate the admin's password + TOTP secret via direct DB access or a break-glass admin recovery path (see open item below); audit `admin_audit_log` for unauthorized actions |
| Domain registration lapses | Low | Medium — loses the URL, breaks Stripe redirect URLs and email links | Auto-renew + calendar reminder before expiry |
| Sole developer unavailable for an extended period | Low–Medium | Medium–High, now that real user data/payments may be involved | A trusted second person has repo, password manager, and Cloudflare/Stripe account access |

**Open item:** there's currently no documented "break-glass" procedure for regaining admin access if every admin's TOTP device is lost simultaneously — worth a deliberate answer (e.g. a securely stored recovery code, or a documented direct-database procedure) rather than discovering the gap during an actual lockout.

## Continuity Procedures

**If data is accidentally deleted or a bad migration runs:**
1. Stop further writes if possible (pause the affected code path or roll back the deploy).
2. Use D1 Time Travel to restore the database to the timestamp just before the incident: `wrangler d1 time-travel restore <database> --timestamp=<iso-timestamp>`.
3. Verify record counts and spot-check affected tables before resuming normal traffic.
4. If the incident is outside Time Travel's retention window, fall back to the most recent scheduled off-platform export and accept the larger data-loss window — this is exactly the gap the scheduled export in Section 3 is meant to close.

**If your dev machine is lost or wiped:**
1. Get a new/working machine.
2. Install git, Node, the Wrangler CLI.
3. `git clone` the remote repo.
4. Pull secrets and env values from the password manager into a fresh `.env` and Cloudflare secrets.
5. Run `wrangler dev` locally to confirm the app boots; `wrangler deploy` if a production redeploy is also needed.

**If the Cloudflare account is locked out or compromised:**
1. Use stored 2FA backup codes to regain access.
2. Rotate every exposed secret immediately (Stripe keys, JWT signing secret, AI provider keys).
3. Check for unauthorized changes (new deploys, DNS changes, added collaborators, new D1 databases) before resuming normal work.
4. If the database itself was affected and Time Travel isn't accessible, restore from the off-platform export.

**If Stripe billing state drifts from D1 (webhook missed, incident on Stripe's side):**
1. Pull the authoritative subscription/customer list from the Stripe dashboard or API.
2. Compare against D1's `users.stripeSubscriptionId`/`subscriptionTier` fields.
3. Reconcile discrepancies manually, favoring Stripe as the source of truth for billing state.
4. Replay missed webhook events from Stripe's dashboard if the gap was a delivery failure rather than a logic error.

**If an admin account is compromised or its TOTP device is lost:**
1. A second admin (or direct DB access) revokes the affected admin's session (`tokenVersion` bump) and resets their password + TOTP secret.
2. Review `admin_audit_log` for any actions taken during the suspected compromise window.
3. If no second admin exists and the TOTP device is unrecoverable, this currently has no documented path — see the open item in Section 4.

**If the sole developer is unavailable for an extended period:**
1. A trusted second person uses the shared password manager entry to access the repo, Cloudflare, and Stripe.
2. They can at minimum keep the domain/hosting paid, monitor for incidents, and avoid unauthorized changes, even without deep product knowledge.

## Roles, Access & Credentials

With a single developer, the priority is making sure no one person's laptop, memory, or continued availability is a single point of failure — not org-chart-style role assignment.

- **Owner (you):** holds primary access to all accounts — git host, Cloudflare, Stripe, domain registrar, password manager, and is one of the TOTP-protected admin accounts in the app itself.
- **Trusted backup contact:** one person with a sealed or shared password-manager entry covering the essentials — not day-to-day access, just emergency recovery (repo, Cloudflare, Stripe, domain).
- **Second admin account:** given the app already has a working admin-TOTP system, create a second live admin account (not just a documented password) held by the backup contact or another trusted person, so a lost TOTP device or account lockout doesn't require the DB-level workaround in Section 5.
- **Credential storage:** a single password manager as the source of truth for every account, its 2FA method, and backup/recovery codes. Avoid `.env`-only or notes-app-only storage for anything painful to lose — this already applies to Stripe and AI-provider secrets today, not just future ones.
- **2FA everywhere it's offered** (git host, Cloudflare, Stripe, domain registrar, the email tied to all of these), with backup codes saved in the password manager, not just on one phone.

## Testing & Maintenance

A backup plan nobody has tested is a hope, not a plan — and D1 Time Travel and a scheduled export have never actually been exercised end-to-end here.

| Check | Frequency | What it confirms |
|---|---|---|
| **Restore the D1 database from a Time Travel bookmark (or the off-platform export) into a scratch environment** | Quarterly | The restore path actually works, not just that backups exist |
| Clone the repo fresh on another machine and run it | Monthly | Nothing critical is stuck only on your primary laptop |
| Confirm password manager has current secrets/2FA codes, including Stripe and AI provider keys | Monthly | Recovery info isn't stale |
| Reconcile D1 subscription state against Stripe's records | Monthly | Billing data hasn't silently drifted |
| Review who has access to what (repo, Cloudflare, Stripe, admin panel) | Quarterly | No orphaned access, nothing missing for the backup contact |
| Confirm domain auto-renew is active and payment method is valid | Quarterly | The domain won't silently lapse |
| Full review of this plan | Each major milestone (first real user, meaningful revenue, second team member) | Plan still matches reality — see Section 8 triggers |

## Roadmap: Scaling This Plan

Each milestone below should trigger a re-review of this doc.

- **Now, before wider launch (if not already true):** stand up the scheduled off-platform D1 export (Section 3) and run the first real restore drill (Section 7) — these are the two items where the plan currently describes a state that doesn't exist yet, and they're the cheapest to fix before real user volume raises the stakes.
- **Before/at first real paying customer:** tighten the database RPO from 24 hours toward 1 hour; add uptime monitoring and alerting; document the Stripe-reconciliation check as a recurring task rather than an ad hoc one.
- **Before meaningful revenue or user volume:** add a status page and a documented incident-response process (who gets paged, how users are communicated with); resolve the admin break-glass gap from Section 4.
- **When a second team member joins:** move from "one owner + backup contact" to defined roles (on-call, deploys, access approvals) and least-privilege access instead of one shared credential set.
- **If infrastructure grows beyond Cloudflare Workers + D1 alone:** revisit multi-region/failover considerations and set RTO/RPO per service, not just per project.
- **Annually regardless of milestones:** run a full recovery drill — actually restore from a backup and confirm it works, rather than assuming it does.
