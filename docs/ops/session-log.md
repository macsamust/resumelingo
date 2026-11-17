# ResumeLingo — Session / Request Log

An audit trail of requests made to Claude on this project and how each was resolved, so a topic can be referenced by ID instead of by description alone (for example, "re: R014").

## How to read this log

| | |
|---|---|
| **ID** | Sequential (`R001`, `R002`, …). Never reused or renumbered, even if an entry is later superseded. |
| **Outcome** | A commit hash if code changed, a file path if a doc or plan was produced, or a short note if it was discussion with no artifact. |
| **Order** | Oldest first within each day; days run oldest to newest. |
| **Upkeep** | Started 2026-09-23 and backfilled from commit history and conversation record. New entries are appended as requests come in; this file is never regenerated from scratch. |
| **Companion** | `client/src/data/adminChangelog.ts` mirrors this file for the Admin Console. Add every new row to both. |

## At a glance

| Date | Entries | IDs | Theme |
|---|---|---|---|
| Sep 11 | 1 | R001 | The first logged item: a tablet-width layout bug on the homepage. |
| Sep 22 | 19 | R002–R020 | The busiest day. Resume Refresh and Full Circle polish, tier-upgrade template swaps, the Dashboard plan-sync bug, the first security audit, and the App Improvements checklist. |
| Sep 23 | 5 | R021–R025 | Backup and disaster-recovery planning, and the start of this audit trail. |
| Sep 25 | 4 | R026–R029 | The breach playbook, the Full Circle video script, the Admin Console email-template page, and the move to build-derived version tags. |
| Sep 27 | 5 | R030–R034 | Branding and tooling decisions, check-in keyword labels, and the What's New inclusion bar plus the admin changelog. |
| Oct 4 | 1 | R035 | Promo codes via Stripe. |
| Oct 23 | 3 | R036–R038 | Promo-code strategy, production verification, the tech-stack inventory, and reader-friendly log formatting. |
| Nov 16 | 14 | R039–R052 | Collapsible, searchable Highlights & Key Achievements editor, a fix for the live-preview pane shrinking, self-updating Years of Experience, and section reordering. |
| Nov 17 | 2 | R053–R054 | ATS Optimized section header lines made reliably visible; typed "Tools Used" pills in Skills & Tools. |
| **Total** | **54** | R001–R054 | |

## September 2026

### Sep 11

The first logged item: a tablet-width layout bug on the homepage.

| ID | Topic | Outcome |
|---|---|---|
| **R001** | Success Stories homepage grid not showing 3 cards in one row at tablet widths | Excluded `.stories-grid` from hardcoded breakpoint overrides in `global.css`, matching `.future-grid` precedent. Commit `bc3c45a`. |

### Sep 22

The busiest day. Resume Refresh and Full Circle polish, tier-upgrade template swaps, the Dashboard plan-sync bug, the first security audit, and the App Improvements checklist.

| ID | Topic | Outcome |
|---|---|---|
| **R002** | Full Circle page's "Apply" stage links to Job Tracker instead of New Resume | Changed the stage's link target. Commit `3e11a7f`. |
| **R003** | Full Circle "Interview" stage copy — Poly rebrand | Updated intro text to reference Poly, the AI Career Coach. Commit `83332c8`. |
| **R004** | Resume Refresh nudge — no way to draft more than one bullet per visit | Added an "Add another bullet" flow with an `onAddAnother` reset handler. Commit `1acb866`. |
| **R005** | Resume Refresh nudge — bullet textarea should expand/resize | Added an Expand/Collapse toggle per bullet box. Commit `f3951a0`. |
| **R006** | Resume Refresh nudge — keyword suggestions should be AI-generated off the resume's title, not a static per-profession catalog; confirmed Starters don't get the nudge at all | Rewrote `ResumeRefreshController.preview()` to try AI generation first, falling back to the curated catalog only on failure/empty result. Commit `68800d4`. |
| **R007** | New Resume / Edit Resume — auto-format Phone field as `nnn-nnn-nnnn` | Added `formatPhoneNumber()` and wired it into both pages' Phone field `onChange`. Commit `86be90c`. |
| **R008** | Dashboard Subscription Management not reflecting Admin > Plans & Pricing edits | First attempt (fixing `Pricing.tsx`'s `FALLBACK_PLANS`, commits `e2d5ce4`/`b52e931`) was a real but incorrect fix — didn't address the actual bug. Root cause found via two user-uploaded screen recordings: `DashboardPage.tsx` read `user.plan.features` from a static server config, not D1. Fixed by fetching live plans client-side and preferring that data. Commit `d3b32e9`. |
| **R009** | Auto-swap resume template on tier upgrade (Starter→Professional: Minimalist; Starter→Premium and Professional→Premium: ATS Optimized) | Added `upgradeStarterTemplate`/`upgradeProfessionalTemplate` logic to `SubscriptionService.syncSubscription()`, only ever replacing a system-assigned default template. Added a Skills & Tools section to the Minimalist template (`templateAccess.ts`) after flagging a regression risk (ATS Check's "+" button) via `AskUserQuestion`. Also fixed a stale "Available on every Premium template" sentence found while in that code. Commits `dc44eb9`, `ce6348d`. |
| **R010** | Edit Resume — add a tooltip to the "Copy" button (Work Experience / Education) | Added `aria-label`/`title` explaining the copy is additive, not a replace. Commit `33a6a07`. |
| **R011** | Resurface prior "version 2 enhancement" brainstorm | Re-quoted the two proposed items from `TODO.md` (Recruiter feedback loop, Resume version performance comparison) in chat. No code/file change. |
| **R012** | Add two enhancement ideas to the Cowork "App Improvements" pinned checklist | Added `seed-4`/`seed-5` items with exact title/description text provided. |
| **R013** | App Improvements — keep unchecked items at the top | Added a stable sort (unchecked first) to the checklist's render function, display-order only. |
| **R014** | App Improvements — tag/call-out for the two new items as "Future Enhancement" | Added an `.item-tag` badge and a `tag` field on those two seed items. |
| **R015** | App Improvements — let the user add a description themselves, not just Claude | Restructured the add-form to include a description textarea alongside the title input. |
| **R016** | Edit Resume Sharing (Starter tier) — explain to users why an unverified/lapsed account shows Private, and whether the verification email should say so | Confirmed neither existing email mentioned the resume-sharing consequence. Added a line to `sendVerificationEmail` and reworded the `hasResumes` branch of `sendAccountSuspendedEmail` to state it explicitly. Commit `a4b0b75`. |
| **R017** | Skills & Tools picker label — show resume title instead of profession | Changed the "Suggested for `<profession>`" label to use `resumeTitle`, falling back to profession for untitled resumes. Noted the underlying curated suggestion *list* is still profession-keyed — only the label changed. Commit `92a8594`. |
| **R018** | General question: what industry security standards apply to commercial apps before launch | Discussion only (GDPR/CCPA, PCI DSS, SOC 2/ISO 27001, OWASP, sector-specific laws) — no code change. |
| **R019** | Security/compliance audit of the actual codebase (PII handling, Stripe/PCI scope, OWASP-style auth/session review) | Delegated to a research subagent; findings reported (bcrypt hashing, hosted Stripe Checkout + verified webhooks, HttpOnly/Secure cookies, admin TOTP 2FA, parameterized SQL — all strengths; no self-service account deletion/export and no refresh-token rotation — gaps). Added `seed-6`/`seed-7` (tagged "Security") to App Improvements. |
| **R020** | Review of an uploaded "Security & Compliance Standards Brief" (authored by "Reese") | Compared the brief's checklist against actual code; confirmed CSP exists (`edgeSecurity.ts`), Privacy/Terms pages exist, admin login requires TOTP. Confirmed the brief's bar was accurate and largely already met, aside from the two gaps from R019. Discussion only. |

### Sep 23

Backup and disaster-recovery planning, and the start of this audit trail.

| ID | Topic | Outcome |
|---|---|---|
| **R021** | Requested a backup/continuity/disaster recovery plan; referenced a same-titled doc from a separate, inaccessible chat | Flagged that the referenced doc (once pasted in) assumed a pre-launch, no-database, no-Stripe stage that doesn't match the live codebase (real D1 schema, real Stripe integration already built). Discussion only — no plan produced yet at this point. |
| **R022** | Scope out a fresh backup/DR plan reflecting the app's actual current state | Produced a full plan (asset inventory, backup strategy, RPO/RTO + scenario table, step-by-step recovery runbooks, roles/access, testing cadence, roadmap) as a Docs artifact, then saved a copy to `docs/ops/Backup-Continuity-Disaster-Recovery-Plan.md`. Key finding: no R2/file storage in use (confirmed via `wrangler.jsonc` — D1 + Workers AI only), so the asset inventory was already complete without it. |
| **R023** | Add a pointer to the new DR plan in App Improvements | Added `seed-8` (tagged "Ops"): stand up scheduled off-platform D1 exports and run a real restore drill, plus the admin break-glass gap. |
| **R024** | Whether query/request IDs exist for referencing past topics; requested an audit trail | This log. No native per-query ID exists in the chat platform itself — this file is the substitute, maintained going forward in this repo. |
| **R025** | Follow-up on the security review priority list — breach response playbook | Produced a full playbook (roles/decision authority, detection grounded in the existing `SecurityAlertService`/`SecurityMonitorService` infra, severity classification with GDPR 72h/state-law clocks, step-by-step response procedure, notification templates, post-incident review) as a Docs artifact, then saved a copy to `docs/ops/Security-Incident-Breach-Response-Playbook.md`. |

### Sep 25

The breach playbook, the Full Circle video script, the Admin Console email-template page, and the move to build-derived version tags.

| ID | Topic | Outcome |
|---|---|---|
| **R026** | Opinion + script/shot-list for a YouTube walkthrough video of the Full Circle loop | Gave an opinion (good idea, with caveats on feature stability and using a clean demo account). Drafted a 3-minute script/shot list grounded in the real `/full-circle` copy and routes as a Docs artifact, then saved a copy to `docs/marketing/Full-Circle-Walkthrough-Video-Script.md`. |
| **R027** | List every email ResumeLingo sends; build a preview-only Admin Console page with a comment field per template | Listed all 10 email templates (11 counting the account-suspended with/without-resumes split) from `EmailService.ts`. Built the Admin Console's Email Templates page: refactored `EmailService` to split each template's HTML-building into a `buildX`/`renderPreview` pair so previews can never drift from real sends, added an `email_template_notes` table + repository for per-template comments, a new controller/routes, and `AdminEmailTemplatesPage.tsx` (expandable sandboxed-iframe preview + comment textarea). Deliberately preview-only, not an inline editor. Commit `fd6cb2e` (also caught and committed the previously-missed DR plan file in the same commit). |
| **R028** | "When should we start thinking about app versions?" | Recommended build-derived version identifiers over a versioned "2.0" relaunch, plus a changelog instead of bundling changes into a big release. Built both: `vite.config.ts` embeds the git short hash + build date at build time (`__APP_VERSION__`/`__APP_BUILD_DATE__`), shown in the public Footer and the Admin Console sidebar; new `/whats-new` page (`ChangelogPage.tsx` + `data/changelog.ts`) with a hand-curated, user-facing subset of recent changes. Commit `3527be4`. |
| **R029** | Remove the build/version tag from the public footer, keep it Admin-only | Agreed the public-facing tag could read as confusing on a production app. Removed it from `Footer.tsx` (and its now-unused CSS); left it in place in `AdminShell.tsx`. Commit `daa8472`. |

### Sep 27

Branding and tooling decisions, check-in keyword labels, and the What's New inclusion bar plus the admin changelog.

| ID | Topic | Outcome |
|---|---|---|
| **R030** | Pick the official ResumeLingo tagline: "We Speak Resume." vs. "Come full circle." | Recommended "We Speak Resume." (ties to the ResumeLingo/Poly name, evergreen) over "Come full circle." (already the Full Circle feature's own name — promoting it to the company tagline risked phrase collision). Discussion only, no code change — both quotes stay where they already are. |
| **R031** | Recommend a video editing tool for the Full Circle walkthrough video | Recommended Screen Studio (capture) + Descript (transcript-first assembly/voiceover) as the best fit for a script-driven, stage-by-stage recording; Camtasia and OBS+DaVinci Resolve as alternatives. Discussion only. |
| **R032** | Resume check-in — label each drafted bullet by its keyword instead of a bare number | Added `draftKeywords` (parallel to `draftItems`) tracking which keyword produced each bullet; label now reads "Resume bullet — `<keyword>`", falling back to the old numbered/blank behavior for CAR-form bullets (no source keyword). Commit `1d13ab7`. |
| **R033** | Should the What's New page be subscriber-visible, and does the tablet-layout-fix entry earn its spot? | Agreed: keep the page (the other 5 entries clear the bar), drop the tablet fix — a subscriber who never hit that bug gets nothing from reading about it, and it risked making the page read as padding. Documented an explicit inclusion bar in `data/changelog.ts`'s doc comment for future entries. Commit `3611ebd`. |
| **R034** | Build an admin-only changelog — a full catch-all identifying every single change, no matter the size or impact | New `/admin/changelog` page (`AdminChangelogPage.tsx` + `data/adminChangelog.ts`) mirroring every row of this log, unfiltered — the counterpart to the curated `/whats-new` page. Includes a search box (keyword or ID) since the list only grows. This file and `data/adminChangelog.ts` are companions going forward — add a row to both when logging a new change. Commit `b9f9f16`. |

## October 2026

### Oct 4

Promo codes via Stripe.

| ID | Topic | Outcome |
|---|---|---|
| **R035** | Add a way to use promo codes | Recommended using Stripe's built-in promotion codes on the existing hosted Checkout rather than building our own. Added `allow_promotion_codes: true` to `StripeService.createCheckoutSession` and wrote `docs/ops/Promo-Codes.md` (how to create a coupon/code in Stripe, plus caveats: list prices in-app stay undiscounted, no Admin Console reporting, no in-app code field yet). |

### Oct 23

Promo-code strategy, production verification, and the tech-stack inventory.

| ID | Topic | Outcome |
|---|---|---|
| **R036** | Promo code coupon strategy and production verification | Recommended a launch coupon (25% off for 3 months, first-time customers, expiry date, ~100-redemption cap) with dollar impact worked out for Professional ($9.99 → $7.49) and Premium ($19.99 → $14.99). Test-card attempt failed because production runs the live Stripe key; a first live code showed "invalid" until the live-mode coupon/code was set up correctly. CJ then verified a promo code end to end in production. No code change. |
| **R037** | List all resources/services used to maintain the site, and save it for reference | Inventoried hosting, third-party services, libraries (with installed versions), tooling and secret names from `wrangler.jsonc`, the `package.json` files and CI config. Saved to `docs/ops/Tech-Stack-Inventory.md`. |
| **R038** | Make the session log, tech-stack inventory and Admin changelog reader-friendly | Regrouped `session-log.md` by month and day with an at-a-glance table and per-day tables; added an overview, layer table, jobs table and secrets table to `docs/ops/Tech-Stack-Inventory.md`; `/admin/changelog` now renders month sections as ID / Date / Topic / Outcome tables (`AdminChangelogPage.tsx`, `global.css`). No behavior change. |

## November 2026

### Nov 16

Collapsible, searchable Highlights & Key Achievements editor, a fix for the live-preview pane shrinking, self-updating Years of Experience, and section reordering.

| ID | Topic | Outcome |
|---|---|---|
| **R039** | Highlights & Key Achievements gets very long for seasoned users: roll it up | `AchievementEditor.tsx` now collapses every bullet to a one-line summary (one open for editing at a time), groups bullets under collapsible job headers with a bullet count when "Combine Work Experience with Achievements" is on (plus an "Other highlights" group for unlinked bullets), and adds a search box (shown at 4+ bullets) that filters by text and auto-opens matching groups. Per-job "Add achievement"; ↑/↓ reorder within a job. Display-only: the `AchievementEntry[]` data and `experienceId` links are unchanged. Also applies to the Resume Builder and Admin edit pages, which share the component. |
| **R040** | Edit page: "Expand all" shrinks the live preview pane; keep both sides equal | Root cause: `.builder-grid` used `1fr 1fr`, and a plain `1fr` track has `min-width: auto`, so a long no-wrap line in the form (the new one-line achievement rows) widened the left column. Changed to `minmax(0, 1fr) minmax(0, 1fr)` plus `min-width: 0` on its children in `global.css`. No component change. |
| **R041** | Additional Details: Years of Experience should update itself each year | Years of Experience now counts up on its own. The typed number is stored with the date it was entered (as a reserved `_yearsExperienceAsOf` key inside the existing answers JSON, so no migration); the `Resume` model strips that key and returns base + whole years elapsed everywhere (edit page, public link, PDF, versions). The generated Summary keeps the base number in its "N+ years of experience" phrase and is swapped forward on read, so it never needs regenerating; a hand-edited summary updates only if it still uses that exact phrase. Saving an unchanged value keeps its original date; changing it re-bases to today. Resumes saved before this count from their last-updated date (can only under-count). Non-numeric entries like "10-15" are left as typed. New `worker/src/utils/yearsExperience.ts` (+ tests), edits to `Resume.ts` and `ResumeService.ts` (create/update), and an "Updates automatically each year." hint under the field in `DynamicQuestionForm.tsx`. Not applied: version-restore (falls back to last-updated date) and the cover letter text. |
| **R042** | Edit page: move Highlights & Key Achievements under Work Experience | Moved the "Highlights & Key Achievements" section to sit directly under "Work Experience" on the Edit Resume page (new order: Work Experience, Highlights & Key Achievements, Education, Languages, Generated Summary & Bullets). Reorder only in `ResumeEditPage.tsx`; no behavior change. The new-resume builder and Admin edit page keep their own order. |
| **R043** | Make the other edit pages' section order match the Edit page | Matched the Admin edit page's section order to the subscriber Edit page for the sections they share: Work Experience, Highlights & Key Achievements, Education, Languages, Generated Summary & Bullets, then Awards (Awards was previously above Languages). Reorder only in `AdminResumeEditPage.tsx`. The new-resume builder keeps its own numbered wizard order. Highlights already sat under Work Experience on both. |
| **R044** | Place Generated Summary & Bullets under Highlights & Key Achievements, everywhere | Moved "Generated Summary & Bullets" to sit directly under "Highlights & Key Achievements" on both the subscriber Edit page and the Admin edit page (order is now Work Experience, Highlights & Key Achievements, Generated Summary & Bullets, Education, Languages, Awards). Reworded the "above" references in the summary panel's helper text on both pages, since the sections it mentions are no longer all above it. The new-resume builder has no summary section, so it's unchanged. No behavior change. |
| **R045** | Bulk paste of achievement bullets, with an AI "tighten" option | New "Paste multiple bullets" option for adding many achievements at once. Each job group in the Highlights & Key Achievements editor (and the flat/unlinked list) gets a button that opens `PasteBulletsPanel.tsx`: paste a block, see a live cleaned preview (bullet markers and numbering stripped, wrapped lines joined, duplicates of existing bullets skipped; logic in `client/src/utils/parseBullets.ts` + tests), then add every line as its own action-only bullet linked to that job. Includes **Have Poly tighten these** (Professional/Premium, same gate as Generate from keywords): new `POST /api/achievement-generate/tighten` and `AchievementGeneratorService.tighten()` rewrite the pasted bullets into impact-focused wording, keeping the person's facts and numbers, never inventing any, returning exactly one bullet per input (original kept for any position the model skips). The preview shows what each bullet was before, with a "Keep my original wording" undo, and nothing is added until the person clicks Add. Starter accounts see an upgrade note; the Admin edit page omits the AI button. Tests: `parseBullets.test.ts`, `AchievementGeneratorService.test.ts`. |
| **R046** | Allow larger resumes to import | Resume Import kept dropping content silently on long resumes. Raised the input limit from 20,000 to 30,000 characters (shared `MAX_INPUT_CHARS`; the over-limit error now says what to do instead) and replaced the flat 20-entry cap with per-list caps: 30 jobs, 20 education, 30 awards, 40 achievement bullets, 60 skills/tools; AI output budget raised from 6,144 to 8,192 tokens. Anything still capped is now reported on the import review screen ("Imported 40 of 45 achievement bullets. Add the rest on the Edit Resume page."), and the AI is told to add a note when it leaves bullets out. Chunked split-and-merge import was considered and deferred until real demand shows up. Files: `ResumeImportService.ts`, `ResumeImportController.ts`, new `ResumeImportService.caps.test.ts`. |
| **R047** | Warn before importing a long resume | Resume Import now warns before the import, not only after. `ResumeImportPanel.tsx` shows a standing heads-up under the intro (about 8 to 10 pages / 30,000 characters, up to 30 jobs and 40 bullets, extras go on the Edit Resume page). After the file's text is read but before any upload or AI call, a file over the limit fails instantly with its character count and what to do; a file over ~22,000 characters gets a longer-wait note while analyzing. New shared constants `IMPORT_MAX_CHARS` / `IMPORT_LONG_CHARS` in `resumeImportExtract.ts` (mirror the Worker's `MAX_INPUT_CHARS`; keep in sync). |
| **R048** | Additional Details: add Security Clearance and Military checkbox; rename Certifications | Additional Details changes. Renamed the `certifications` question to "Certifications and Training" on every profession (the saved key is unchanged, so existing answers carry over) and in the public resume, PDF and text exports. Added two questions to every profession from one place (`withUniversalQuestions` in `worker/src/config/professions.ts`): **Security Clearance** (reuses the existing `clearanceLevel` key, so the Govt Contractor template's clearance banner keeps working; Government Contractor and Military keep their own question type, relabeled from "Clearance Level") and a **Military** yes/no checkbox (stored as "Yes"; not added to the Military profession, where it's implied). New `checkbox` question type in `DynamicQuestionForm.tsx` and the shared/client `ProfessionQuestion` type. Both new answers show under Additional Details on the public resume/PDF, and are excluded from the generated summary's "specializing in…" phrase and fallback bullets (`NON_CONTENT_ANSWER_KEYS` in `ContentGenerator.ts`). |
| **R049** | Public resume label: "Years Experience" should read "Years of Experience" | The public resume, PDF and text download labeled the Years of Experience answer "Years Experience" (built by splitting the saved key). Added a `yearsExperience: "Years of Experience"` entry to `ANSWER_LABEL_OVERRIDES` in `PublicResumePage.tsx` and `pdfExport.ts` so it matches the Edit page's label. |
| **R050** | Military checkbox: show a flag + "Military Service" badge on the resume | When the Military checkbox is on, the resume now shows a small flat U.S. flag with the words "Military Service" above the summary (CJ chose option B from three mockups; worded as service rather than "veteran" so it fits active, reserve and former members). New `AmericanFlag.tsx` (inline SVG, so it renders the same on Windows, where the flag emoji shows as "US"). `ResumePreview.tsx` gets a `militaryService` prop and a `militaryBadgeBlock` rendered inside `summaryBlock` plus the two families whose summary sits in the header (pill-grid-cards, photo-header-list), so every template shows it; styled with `currentColor` to read on light and dark themes. Wired from the Edit, Builder and public pages; the PDF draws the flag from rectangles and keeps "Military Service" as real text, and the text download adds a "Military Service" line. "Military: Yes" is no longer listed under Additional Details since the badge replaces it. Not changed: Admin edit and template-preview pages (no badge there). |
| **R051** | Add Certifications & Training as a section under Education; Awards last | New "Certifications & Training" section, placed directly under Education, with Awards moved to be the last section. Name-only entries (CJ's choice), stored in a new JSON `certifications` column (migration `0051_resume_certifications.sql`, **apply to production with `npm run db:migrate:remote` from `worker/`**). The old Additional Details "Certifications" answer is removed from every profession; existing resumes keep working with no data migration because the `Resume` model strips `answers.certifications` and, while the new column is empty, converts it into entries on read (`worker/src/utils/certifications.ts`, with tests), and the old key is dropped the next time the resume is saved. The content generators still receive the certifications as an answer, so summaries are unchanged. New `CertificationsEditor.tsx` (compact one-line rows; Enter adds a row; pasting a multi-line list splits it into entries). Edit page and Admin edit page order: ... Education, Certifications & Training, Languages, ...; Awards now follows References (Edit page) or sits last (Admin). The new-resume builder gains step 6 "Certifications & training", Answer a few questions is step 7, Awards step 8. The preview renders the section under Education in every template family (including a ledger footer column and a pill card) and puts Awards last in each; the public text download and PDF follow the same order. Version history snapshots include it and "Updated Certifications & Training" appears in change summaries. Also fixed a regression from R041: every save with a Years of Experience value logged a false "Updated Additional Details" in version history (the change check compared the stored base and as-of key against the displayed value). Not done: AI resume import doesn't extract certifications yet. |
| **R052** | Profile template: Work Experience dates/titles look like they skip every other entry | Profile template: with Combine Work Experience with Achievements on, each job's meta column (title, dates, company) was spread down the whole entry, so the company sat far below its title and dates and entries looked like they were missing dates. Cause: the bullets list spanned only the first two grid rows (`grid-row: 1 / span 2`), so a tall list stretched both rows evenly. Fixed in `global.css` with `grid-template-rows: auto auto 1fr` and the bullets spanning all three rows, so the extra height goes to the flexible third row and title, company and dates stay stacked, with dates on the third line at the top. Scoped to the Profile (photo-header-list) template; the mobile single-column override is unchanged. |

### Nov 17

| ID | Topic | Outcome |
|---|---|---|
| **R053** | ATS Optimized: section header flanking lines missing on some headers | ATS Optimized: the Education and Skills & Tools headers seemed to be missing their flanking lines while Awards and Certifications & Training showed them. All four render identical markup and CSS, so the likely cause is the line itself: a 1px box filled with the very pale accent-soft gray (#e5e7eb), which can fade out entirely on a fractional pixel. Replaced with a real 1px border in the template accent at 40% opacity so it shows consistently on every header. |
| **R054** | Edit page: "Tools Used (comma separated)" in Skills & Tools | Edit page, Skills & Tools: added a "Tools Used (comma separated)" box under the Tools pills. Type names separated by commas (e.g. Jira, Tableau, Terraform), press Enter or Add, and each becomes a selected Tools pill, trimmed, de-duplicated against existing tools (case-insensitive) and capped at 60 characters. Typed tools show under Tools alongside the suggestions and are removed by clicking the pill; they save and render on the resume exactly like picked tools. Works on the Admin edit page too (shared editor). Client-only, no migration. |
