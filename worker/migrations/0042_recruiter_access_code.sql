-- Closes a real data-exposure gap found Sep 2026: Recruiter Mode's card
-- (location, expected salary, clearance, work authorization, remote
-- preference) previously had zero access control beyond the resume's own
-- general visibility setting — a resume set to fully "public" with
-- Recruiter Mode on exposed all of it to any anonymous visitor with the
-- link. This adds a separate, resume-owner-set access code specifically for
-- the recruiter card, independent of the resume's own password-protection
-- (accessPassword) — so the resume link can stay public/shareable while the
-- sensitive recruiter card itself requires a code the owner hands out only
-- to the recruiters they want to see it.
--
-- Stored hashed (see ResumeService's use of utils/crypto.ts's sha256Hex),
-- unlike accessPassword above (which this codebase stores in plain text) —
-- a deliberate improvement, not a pattern carried over, since this data is
-- more sensitive than a resume's own link-level password.
ALTER TABLE resumes ADD COLUMN "recruiterAccessCodeHash" TEXT;

-- Same IP + resume-slug guess-throttle pattern as
-- public_resume_password_ip_log (see migration 0034) — a separate table
-- rather than reusing that one so a recruiter-code guessing spree and a
-- password guessing spree against the same resume don't share (and
-- possibly exhaust) the same failure budget.
CREATE TABLE IF NOT EXISTS public_resume_recruiter_code_ip_log (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  slug TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_resume_recruiter_code_ip_log_ip_slug_createdAt
  ON public_resume_recruiter_code_ip_log(ip, slug, "createdAt");
