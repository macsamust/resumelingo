# Recruiter Mode Access Code — QA Report

**Environment:** production `https://resumelingo.com`  
**Date:** 2026-09-11 (ET)  
**Owner account (primary):** `ffox@email.com` (Premium, verified)  
**Resume:** Recruiter Access Code QA 0911  
**Public URL:** https://resumelingo.com/r/fred-fox-recruiter-access-code-qa-0911  
**Codes used:** `bluebird42` → rotated to `sunfish77`  
**Resume password (Part 5):** `resumePass99`

## BLUF

**28/28 Pass, 0 Fail.** Recruiter access code gates Candidate Summary as designed across owner setup, anonymous unlock, rotation, owner-preview, password stacking, Private, and rate limiting.

![Scorecard](recruiter-access-scorecard.png)

## Results by part

| Part | Cases | Result |
|------|-------|--------|
| 1 Owner setup | 1.1–1.6 | **Pass** (also reconfirmed on ffox) |
| 2 Anonymous unlock | 2.1–2.8 | **Pass** |
| 3 Code rotation | 3.1–3.3 | **Pass** |
| 4 Owner preview | 4.1–4.3 | **Pass** |
| 5 Password stack | 5.0–5.4 | **Pass** |
| 6 Private | 6.0–6.1 | **Pass** |
| 7 Rate limit | 7.1 | **Pass** |

## Notable notes (not Fails)

1. **Premium-only** — Professional has no Recruiter Mode UI (confirmed early; plan updated).
2. **`testy_premium@email.com`** completed Part 1 but could not go Public (unverified email / no reachable verify link). Switched to **`ffox@email.com`** for Parts 2–7.
3. **2.7 / 2.8** — Export behavior Pass from on-screen state; Chrome managed downloads deleted TXT/PDF before filesystem copy (no file artifacts).
4. **5.2** — Wrong resume password correctly denied access; UI stayed on password prompt with **no explicit error string**.
5. **7.1** — After 12 wrong codes: `Too many attempts from this network. Please try again later.`

## Final resume state

- Visibility: **Public**
- Recruiter Mode: **enabled**
- Access code: **sunfish77** (not redisplayed in UI)
- Session: logged out after Part 7

## Artifacts

Directory: `/workspace/resumelingo-qa/formal/recruiter-access/`  
Per-part JSON: `part1-results.json` … `part7-results.json`
