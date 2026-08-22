# To Do — Later Consideration

## Admin console — security/access hardening

Flagged during the admin console audit but deliberately held back, since each needs a product decision (not just implementation) before starting:

- **Admin roles/permissions.** Today every admin account has identical, all-or-nothing access — any admin can delete users, change plan pricing, or remove other admins (see `AdminAdminsPage.tsx`'s own warning banner). Needs a decision on what a "read-only" or "support" tier admin should and shouldn't be able to do before it can be built.
- **Shorter admin JWT expiry + token revocation.** Admin tokens are stateless with a flat 7-day expiry (`TokenService`, `createServices.ts`). Removing an admin (`AdminManagementController.remove`) doesn't invalidate their already-issued token — it stays valid for up to 7 days after removal. Needs a decision on the tradeoff between session length and how quickly a removed admin's access should actually stop.
- **2FA on admin login.** `AdminService.login` is password-only. Given this console can delete accounts and change billing tiers, TOTP or WebAuthn would meaningfully raise the bar — needs a decision on which second factor to support and the enrollment/recovery flow.
- **Tamper-evident audit log.** `admin_audit_log` rows are plain inserts with no hash chaining/checksum — a rogue admin with direct DB access could edit or delete past entries without a trace. Needs a decision on whether to hash-chain entries, ship them to an external append-only log, or both.

## Subscriber-facing — resume content editing

- **Direct editing of the generated Summary/Objective/Profile text.** `generatedSummary` (labeled "Objective," "Summary," "Profile," etc. depending on template — see `templateStyles.ts`'s `summaryLabel`) is produced by a deterministic rule-based generator (`ContentGenerator.ts`) from profession + interview answers + achievements, and today only an admin can hand-edit it (added for support cases — see `AdminResumeEditPage.tsx`). Regular subscribers have no way to tweak the wording themselves. Recommended approach: add an editable field on the subscriber's own Edit Resume page, plus a `summaryManuallyEdited` flag so `ResumeService.update` stops silently regenerating over a manual edit when profession/answers/achievements/name/title change afterward — with a "reset to auto-generated" action to opt back in. Same treatment would apply to `generatedBullets`.
- **Multiple auto-generated variants to choose from.** Lower priority than direct editing, and more work: the generator is fully deterministic (no randomness, no AI call), so "regenerate" would produce identical output today. Real variants would need either several alternate phrasing templates per profession or an LLM-backed generator, neither of which exists in this codebase yet. Worth revisiting only if user feedback after shipping direct editing shows people want alternatives rather than just wanting to fix the wording themselves.
