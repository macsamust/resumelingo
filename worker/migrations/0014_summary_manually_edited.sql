-- Lets a subscriber hand-edit generatedSummary/generatedBullets on their own
-- Edit Resume page (previously only AdminResumeEditPage.tsx could touch
-- these, for support cases) without ResumeService.update silently
-- regenerating over that edit the next time profession/answers/achievements/
-- name/title change. Defaults to 0 (auto-generated) so every existing resume
-- keeps regenerating exactly as it does today until the owner explicitly
-- edits the text themselves. See TODO.md's "Product review" note.
ALTER TABLE resumes ADD COLUMN "summaryManuallyEdited" INTEGER NOT NULL DEFAULT 0;
