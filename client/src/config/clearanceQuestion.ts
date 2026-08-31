import { ProfessionQuestion } from "../types";

/**
 * Injected into Additional Details whenever the Govt Contractor *template*
 * is selected, regardless of which *profession* the resume has — profession
 * and template are fully independent choices in this app, and the
 * Government Contractor *profession*'s own questions (which already
 * include a clearanceLevel question — see worker/src/config/professions.ts)
 * only apply when that profession is also selected. Shared by
 * ResumeEditPage and ResumeBuilderPage so the two pages can't drift apart
 * on the exact option list.
 */
export const CLEARANCE_QUESTION: ProfessionQuestion = {
  key: "clearanceLevel",
  label: "Clearance Level",
  type: "select",
  options: ["Public Trust", "L", "Q", "SAP", "Confidential", "Secret", "Top Secret", "Top Secret (SCI)"],
};

/**
 * Merges a profession's own Additional Details questions with
 * CLEARANCE_QUESTION when the Govt Contractor template is selected, deduped
 * by key so a resume that's *also* on the Government Contractor profession
 * doesn't get the question listed twice.
 */
export function withClearanceQuestion(questions: ProfessionQuestion[], templateKey: string | undefined): ProfessionQuestion[] {
  if (templateKey === "government-contractor" && !questions.some((q) => q.key === CLEARANCE_QUESTION.key)) {
    return [...questions, CLEARANCE_QUESTION];
  }
  return questions;
}
