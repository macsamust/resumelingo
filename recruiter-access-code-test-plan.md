# Recruiter Mode Access Code — QA Test Plan

## What this feature does

Recruiter Mode's "Candidate Summary" card (location, availability, expected salary, clearance, work authorization, remote preference, and optionally references) is now hidden by default on a public resume link. It only appears to someone who enters a separate access code the resume owner sets — independent of the resume's own Public / Private / Password-Protected visibility setting. The goal: a resume link can stay fully public and shareable while the recruiter-sensitive card stays visible only to whoever the owner hands the code to.

Two testers are enough: one acting as the **resume owner** (logged in), one acting as an **anonymous recruiter/visitor** (logged out, ideally a different browser or incognito window — this matters, see notes below).

## Prerequisites

- Test account on the Premium tier (Recruiter Mode is Premium-only — Professional does not have access to it).
- Migration `0042_recruiter_access_code.sql` applied to whichever database you're testing against (local or production D1). If you see `D1_ERROR: no such table`, the migration hasn't been applied yet — stop and apply it first.

## Part 1 — Owner setup (Edit Resume page)

| # | Steps | Expected result |
|---|---|---|
| 1.1 | Open Edit Resume. Scroll to Recruiter Mode. Check "Enable Recruiter Mode for this resume." Leave "Recruiter access code" blank. Click Save changes. | Save fails with a message saying a code must be set before Recruiter Mode can be turned on. Recruiter Mode should not end up enabled. |
| 1.2 | Type a code (e.g. `bluebird42`) into the access code field. Click Save changes. | Save succeeds. |
| 1.3 | Reload the page (or navigate away and back). | The "Recruiter access code" field is **blank** — this is intentional, the app never redisplays a saved secret. Text near the field should indicate a code is currently set. |
| 1.4 | With Recruiter Mode still on and a code already set, leave the access code field blank and click Save changes again (e.g. after editing an unrelated field like Location). | Save succeeds and the existing code is preserved — a blank field means "no change," never "clear the code." |
| 1.5 | Type only a space character into the access code field and click Save. | Should behave as if blank — either rejected (if no code exists yet) or treated as no change (if a code already exists). A whitespace-only string should never become the stored code. |
| 1.6 | Uncheck "Enable Recruiter Mode," save, then re-check it and save again without typing a new code. | Should succeed — turning the mode off and back on should NOT require re-entering the code, since one is already on file. |

## Part 2 — Anonymous visitor unlock flow (View Resume link)

Do this section **logged out**, in a different browser or incognito window, using the public resume link (`/r/<slug>`). This matters: if you stay logged in as the owner in the same browser, you will bypass some checks that a real recruiter would still be subject to (see Part 4).

| # | Steps | Expected result |
|---|---|---|
| 2.1 | Open the public link. | If the resume's own visibility is Public, it loads immediately. The main resume content is visible, but a "Candidate Summary (locked)" section appears instead of the real card, with a code entry field. |
| 2.2 | Leave the code field blank. | "Unlock candidate summary" button should be disabled/unclickable. |
| 2.3 | Type only spaces into the code field. | Button should remain disabled — whitespace-only input shouldn't count as a real attempt. |
| 2.4 | Type an incorrect code (e.g. `wrongcode`) and submit. | A generic "Incorrect access code" error. Card stays locked. Rest of the resume is unaffected. |
| 2.5 | Type the correct code (`bluebird42` from 1.2). | Candidate Summary card appears with the location/salary/clearance/etc. data. |
| 2.6 | Reload the page from scratch (full browser refresh, not just re-clicking around). | The card should be locked again and require the code re-entry — it should NOT remember the previous unlock. This is deliberate: it's what makes revoking access by changing the code actually work (see Part 3). |
| 2.7 | Download the resume as text (or PDF) after unlocking the card in step 2.5. | The exported file should include the recruiter card's data, since it was visible on screen at export time. |
| 2.8 | Download the resume as text/PDF **without** unlocking the card first. | The export should NOT include the recruiter-only fields. |

## Part 3 — Code rotation (revocation)

| # | Steps | Expected result |
|---|---|---|
| 3.1 | As the owner, change the access code to a new value (e.g. `bluebird42` → `sunfish77`) and save. | Save succeeds. |
| 3.2 | As the anonymous visitor (same browser/tab that unlocked the card in 2.5), reload the public link and try the OLD code (`bluebird42`). | Should fail — old code no longer works. |
| 3.3 | Try the new code (`sunfish77`). | Should succeed. |

## Part 4 — Owner-preview behavior (View Resume button, while logged in)

This is worth testing deliberately since it's easy to get confused here.

| # | Steps | Expected result |
|---|---|---|
| 4.1 | While logged in as the resume's owner, click "View Resume" from Edit Resume / My Resumes. | If the resume is Private or Password-Protected, you can still see the base resume content without entering a password — owners always bypass the resume's own visibility gate on their own resume. |
| 4.2 | On that same owner preview, look at the Candidate Summary card. | It should show "locked" just like an anonymous visitor would see, and require the actual, current access code — owners do **not** get a free pass on the code itself. Entering a wrong code here should fail exactly as it does for a stranger. |
| 4.3 | Enter the correct current code. | Card unlocks. |

## Part 5 — Interaction with the resume's own Password protection

Set the resume's visibility to "Password Protected" with its own password (distinct from the recruiter access code) for this section.

| # | Steps | Expected result |
|---|---|---|
| 5.1 | As an anonymous visitor, open the link. | Prompted for the resume's password first (separate prompt/screen from the recruiter code). |
| 5.2 | Enter the wrong resume password. | Access denied — resume content should not load at all, and the recruiter card definitely should not appear. |
| 5.3 | Enter the correct resume password. | Resume loads. Candidate Summary still shows "locked" — the resume password does not automatically unlock the recruiter card. |
| 5.4 | Enter the correct recruiter access code. | Card unlocks. Confirms the two secrets are independent layers stacked on top of each other, not substitutes for each other. |

## Part 6 — Private resumes

| # | Steps | Expected result |
|---|---|---|
| 6.1 | Set visibility to Private. As an anonymous visitor, open the link. | Access denied entirely with a "this resume is private" message — no password or code prompt should ever appear, since a private resume shouldn't be reachable by anyone but the owner regardless of any code. |

## Part 7 — Rate limiting (optional, if testers have time)

| # | Steps | Expected result |
|---|---|---|
| 7.1 | As an anonymous visitor, submit 10+ incorrect access codes in a row against the same resume link within a few minutes. | After the failure threshold, further attempts should return a "too many attempts, try again later" message rather than continuing to check the code. |

## What to report back

For each failing row, please note: which step, what you expected vs. what actually happened, whether you were logged in or logged out at the time, and which browser/window you used (this mattered in a couple of bugs already found during development — logged-in-vs-logged-out state changes what's enforced). Screenshots of any unexpected "unlocked" card or any error message are especially useful.
