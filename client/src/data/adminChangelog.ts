export interface AdminChangelogEntry {
  id: string;
  date: string;
  topic: string;
  outcome: string;
}

/**
 * Admin-only changelog — a full catch-all, unlike data/changelog.ts's
 * curated subscriber-facing subset (CJ, Sep 2026: "This log will identify
 * every single change no matter the size or impact"). Every entry here is a
 * structured mirror of docs/ops/session-log.md's table — same IDs, same
 * ordering, same content — rendered in the Admin Console instead of only
 * being readable via the repo. The two files are companions, not one
 * generated from the other: add a new row to both when a change is logged,
 * same as session-log.md's own "append going forward" convention. Kept as
 * plain ascending order (oldest first) here, same as the source table;
 * AdminChangelogPage reverses it for display.
 */
export const ADMIN_CHANGELOG_ENTRIES: AdminChangelogEntry[] = [
  {
    id: "R001",
    date: "2026-09-11",
    topic: "Success Stories homepage grid not showing 3 cards in one row at tablet widths",
    outcome: "Excluded `.stories-grid` from hardcoded breakpoint overrides in `global.css`, matching `.future-grid` precedent. Commit `bc3c45a`.",
  },
  {
    id: "R002",
    date: "2026-09-22",
    topic: "Full Circle page's \"Apply\" stage links to Job Tracker instead of New Resume",
    outcome: "Changed the stage's link target. Commit `3e11a7f`.",
  },
  {
    id: "R003",
    date: "2026-09-22",
    topic: "Full Circle \"Interview\" stage copy — Poly rebrand",
    outcome: "Updated intro text to reference Poly, the AI Career Coach. Commit `83332c8`.",
  },
  {
    id: "R004",
    date: "2026-09-22",
    topic: "Resume Refresh nudge — no way to draft more than one bullet per visit",
    outcome: "Added an \"Add another bullet\" flow with an `onAddAnother` reset handler. Commit `1acb866`.",
  },
  {
    id: "R005",
    date: "2026-09-22",
    topic: "Resume Refresh nudge — bullet textarea should expand/resize",
    outcome: "Added an Expand/Collapse toggle per bullet box. Commit `f3951a0`.",
  },
  {
    id: "R006",
    date: "2026-09-22",
    topic:
      "Resume Refresh nudge — keyword suggestions should be AI-generated off the resume's title, not a static per-profession catalog; confirmed Starters don't get the nudge at all",
    outcome:
      "Rewrote `ResumeRefreshController.preview()` to try AI generation first, falling back to the curated catalog only on failure/empty result. Commit `68800d4`.",
  },
  {
    id: "R007",
    date: "2026-09-22",
    topic: "New Resume / Edit Resume — auto-format Phone field as `nnn-nnn-nnnn`",
    outcome: "Added `formatPhoneNumber()` and wired it into both pages' Phone field `onChange`. Commit `86be90c`.",
  },
  {
    id: "R008",
    date: "2026-09-22",
    topic: "Dashboard Subscription Management not reflecting Admin > Plans & Pricing edits",
    outcome:
      "First attempt (fixing `Pricing.tsx`'s `FALLBACK_PLANS`, commits `e2d5ce4`/`b52e931`) was a real but incorrect fix — didn't address the actual bug. Root cause found via two user-uploaded screen recordings: `DashboardPage.tsx` read `user.plan.features` from a static server config, not D1. Fixed by fetching live plans client-side and preferring that data. Commit `d3b32e9`.",
  },
  {
    id: "R009",
    date: "2026-09-22",
    topic:
      "Auto-swap resume template on tier upgrade (Starter→Professional: Minimalist; Starter→Premium and Professional→Premium: ATS Optimized)",
    outcome:
      "Added `upgradeStarterTemplate`/`upgradeProfessionalTemplate` logic to `SubscriptionService.syncSubscription()`, only ever replacing a system-assigned default template. Added a Skills & Tools section to the Minimalist template (`templateAccess.ts`) after flagging a regression risk (ATS Check's \"+\" button) via AskUserQuestion. Also fixed a stale \"Available on every Premium template\" sentence found while in that code. Commits `dc44eb9`, `ce6348d`.",
  },
  {
    id: "R010",
    date: "2026-09-22",
    topic: "Edit Resume — add a tooltip to the \"Copy\" button (Work Experience / Education)",
    outcome: "Added `aria-label`/`title` explaining the copy is additive, not a replace. Commit `33a6a07`.",
  },
  {
    id: "R011",
    date: "2026-09-22",
    topic: "Resurface prior \"version 2 enhancement\" brainstorm",
    outcome: "Re-quoted the two proposed items from `TODO.md` (Recruiter feedback loop, Resume version performance comparison) in chat. No code/file change.",
  },
  {
    id: "R012",
    date: "2026-09-22",
    topic: "Add two enhancement ideas to the Cowork \"App Improvements\" pinned checklist",
    outcome: "Added `seed-4`/`seed-5` items with exact title/description text provided.",
  },
  {
    id: "R013",
    date: "2026-09-22",
    topic: "App Improvements — keep unchecked items at the top",
    outcome: "Added a stable sort (unchecked first) to the checklist's render function, display-order only.",
  },
  {
    id: "R014",
    date: "2026-09-22",
    topic: "App Improvements — tag/call-out for the two new items as \"Future Enhancement\"",
    outcome: "Added an `.item-tag` badge and a `tag` field on those two seed items.",
  },
  {
    id: "R015",
    date: "2026-09-22",
    topic: "App Improvements — let the user add a description themselves, not just Claude",
    outcome: "Restructured the add-form to include a description textarea alongside the title input.",
  },
  {
    id: "R016",
    date: "2026-09-22",
    topic:
      "Edit Resume Sharing (Starter tier) — explain to users why an unverified/lapsed account shows Private, and whether the verification email should say so",
    outcome:
      "Confirmed neither existing email mentioned the resume-sharing consequence. Added a line to `sendVerificationEmail` and reworded the `hasResumes` branch of `sendAccountSuspendedEmail` to state it explicitly. Commit `a4b0b75`.",
  },
  {
    id: "R017",
    date: "2026-09-22",
    topic: "Skills & Tools picker label — show resume title instead of profession",
    outcome:
      "Changed the \"Suggested for `<profession>`\" label to use `resumeTitle`, falling back to profession for untitled resumes. Noted the underlying curated suggestion list is still profession-keyed — only the label changed. Commit `92a8594`.",
  },
  {
    id: "R018",
    date: "2026-09-22",
    topic: "General question: what industry security standards apply to commercial apps before launch",
    outcome: "Discussion only (GDPR/CCPA, PCI DSS, SOC 2/ISO 27001, OWASP, sector-specific laws) — no code change.",
  },
  {
    id: "R019",
    date: "2026-09-22",
    topic: "Security/compliance audit of the actual codebase (PII handling, Stripe/PCI scope, OWASP-style auth/session review)",
    outcome:
      "Delegated to a research subagent; findings reported (bcrypt hashing, hosted Stripe Checkout + verified webhooks, HttpOnly/Secure cookies, admin TOTP 2FA, parameterized SQL — all strengths; no self-service account deletion/export and no refresh-token rotation — gaps). Added `seed-6`/`seed-7` (tagged \"Security\") to App Improvements.",
  },
  {
    id: "R020",
    date: "2026-09-22",
    topic: "Review of an uploaded \"Security & Compliance Standards Brief\" (authored by \"Reese\")",
    outcome:
      "Compared the brief's checklist against actual code; confirmed CSP exists (`edgeSecurity.ts`), Privacy/Terms pages exist, admin login requires TOTP. Confirmed the brief's bar was accurate and largely already met, aside from the two gaps from R019. Discussion only.",
  },
  {
    id: "R021",
    date: "2026-09-23",
    topic: "Requested a backup/continuity/disaster recovery plan; referenced a same-titled doc from a separate, inaccessible chat",
    outcome:
      "Flagged that the referenced doc (once pasted in) assumed a pre-launch, no-database, no-Stripe stage that doesn't match the live codebase (real D1 schema, real Stripe integration already built). Discussion only — no plan produced yet at this point.",
  },
  {
    id: "R022",
    date: "2026-09-23",
    topic: "Scope out a fresh backup/DR plan reflecting the app's actual current state",
    outcome:
      "Produced a full plan (asset inventory, backup strategy, RPO/RTO + scenario table, step-by-step recovery runbooks, roles/access, testing cadence, roadmap) as a Docs artifact, then saved a copy to `docs/ops/Backup-Continuity-Disaster-Recovery-Plan.md`. Key finding: no R2/file storage in use (confirmed via `wrangler.jsonc` — D1 + Workers AI only), so the asset inventory was already complete without it.",
  },
  {
    id: "R023",
    date: "2026-09-23",
    topic: "Add a pointer to the new DR plan in App Improvements",
    outcome: "Added `seed-8` (tagged \"Ops\"): stand up scheduled off-platform D1 exports and run a real restore drill, plus the admin break-glass gap.",
  },
  {
    id: "R024",
    date: "2026-09-23",
    topic: "Whether query/request IDs exist for referencing past topics; requested an audit trail",
    outcome: "This log. No native per-query ID exists in the chat platform itself — this file is the substitute, maintained going forward in this repo.",
  },
  {
    id: "R025",
    date: "2026-09-23",
    topic: "Follow-up on the security review priority list — breach response playbook",
    outcome:
      "Produced a full playbook (roles/decision authority, detection grounded in the existing `SecurityAlertService`/`SecurityMonitorService` infra, severity classification with GDPR 72h/state-law clocks, step-by-step response procedure, notification templates, post-incident review) as a Docs artifact, then saved a copy to `docs/ops/Security-Incident-Breach-Response-Playbook.md`.",
  },
  {
    id: "R026",
    date: "2026-09-25",
    topic: "Opinion + script/shot-list for a YouTube walkthrough video of the Full Circle loop",
    outcome:
      "Gave an opinion (good idea, with caveats on feature stability and using a clean demo account). Drafted a 3-minute script/shot list grounded in the real `/full-circle` copy and routes as a Docs artifact, then saved a copy to `docs/marketing/Full-Circle-Walkthrough-Video-Script.md`.",
  },
  {
    id: "R027",
    date: "2026-09-25",
    topic: "List every email ResumeLingo sends; build a preview-only Admin Console page with a comment field per template",
    outcome:
      "Listed all 10 email templates (11 counting the account-suspended with/without-resumes split) from `EmailService.ts`. Built the Admin Console's Email Templates page: refactored `EmailService` to split each template's HTML-building into a `buildX`/`renderPreview` pair so previews can never drift from real sends, added an `email_template_notes` table + repository for per-template comments, a new controller/routes, and `AdminEmailTemplatesPage.tsx` (expandable sandboxed-iframe preview + comment textarea). Deliberately preview-only, not an inline editor. Commit `fd6cb2e` (also caught and committed the previously-missed DR plan file in the same commit).",
  },
  {
    id: "R028",
    date: "2026-09-25",
    topic: "\"When should we start thinking about app versions?\"",
    outcome:
      "Recommended build-derived version identifiers over a versioned \"2.0\" relaunch, plus a changelog instead of bundling changes into a big release. Built both: `vite.config.ts` embeds the git short hash + build date at build time (`__APP_VERSION__`/`__APP_BUILD_DATE__`), shown in the public Footer and the Admin Console sidebar; new `/whats-new` page (`ChangelogPage.tsx` + `data/changelog.ts`) with a hand-curated, user-facing subset of recent changes. Commit `3527be4`.",
  },
  {
    id: "R029",
    date: "2026-09-25",
    topic: "Remove the build/version tag from the public footer, keep it Admin-only",
    outcome: "Agreed the public-facing tag could read as confusing on a production app. Removed it from `Footer.tsx` (and its now-unused CSS); left it in place in `AdminShell.tsx`. Commit `daa8472`.",
  },
  {
    id: "R030",
    date: "2026-09-27",
    topic: "Pick the official ResumeLingo tagline: \"We Speak Resume.\" vs. \"Come full circle.\"",
    outcome:
      "Recommended \"We Speak Resume.\" (ties to the ResumeLingo/Poly name, evergreen) over \"Come full circle.\" (already the Full Circle feature's own name — promoting it to the company tagline risked phrase collision). Discussion only, no code change — both quotes stay where they already are.",
  },
  {
    id: "R031",
    date: "2026-09-27",
    topic: "Recommend a video editing tool for the Full Circle walkthrough video",
    outcome:
      "Recommended Screen Studio (capture) + Descript (transcript-first assembly/voiceover) as the best fit for a script-driven, stage-by-stage recording; Camtasia and OBS+DaVinci Resolve as alternatives. Discussion only.",
  },
  {
    id: "R032",
    date: "2026-09-27",
    topic: "Resume check-in — label each drafted bullet by its keyword instead of a bare number",
    outcome:
      "Added `draftKeywords` (parallel to `draftItems`) tracking which keyword produced each bullet; label now reads \"Resume bullet — `<keyword>`\", falling back to the old numbered/blank behavior for CAR-form bullets (no source keyword). Commit `1d13ab7`.",
  },
  {
    id: "R033",
    date: "2026-09-27",
    topic: "Should the What's New page be subscriber-visible, and does the tablet-layout-fix entry earn its spot?",
    outcome:
      "Agreed: keep the page (the other 5 entries clear the bar), drop the tablet fix — a subscriber who never hit that bug gets nothing from reading about it, and it risked making the page read as padding. Documented an explicit inclusion bar in `data/changelog.ts`'s doc comment for future entries. Commit `3611ebd`.",
  },
  {
    id: "R034",
    date: "2026-09-27",
    topic: "Build an admin-only changelog — a full catch-all identifying every single change, no matter the size or impact",
    outcome:
      "New Admin Console page (`AdminChangelogPage.tsx` + `data/adminChangelog.ts`) mirroring every row of `docs/ops/session-log.md`, unfiltered — the counterpart to the curated subscriber-facing `/whats-new` page. Includes a search box over topic/outcome text given the list only grows over time.",
  },
];
