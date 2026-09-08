import { ProfessionQuestion } from "../../types";
import { PolyAnimated } from "../brand/PolyAnimated";

interface Props {
  questions: ProfessionQuestion[];
  answers: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

/**
 * Renders the "system interviews you" form: the question set changes
 * entirely based on which profession the user selected (see
 * config/professions.ts on the server, which is the source of truth).
 *
 * Shared by both ResumeBuilderPage and ResumeEditPage's "Answer a few
 * questions" section — the small Poly intro row lives here rather than in
 * either page, so both flows pick it up from one change. This is literally
 * the "Poly interviews you" moment the homepage pitch describes, which
 * otherwise had no Poly presence anywhere in the actual product.
 */
export function DynamicQuestionForm({ questions, answers, onChange }: Props) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <PolyAnimated expression="wave" size={32} decorative />
        <span className="hero-note" style={{ margin: 0 }}>A few questions from Poly, tailored to your profession.</span>
      </div>
      {questions.map((q) => (
        <div className="field" key={q.key}>
          <label>
            {q.label}
            {q.type === "list" ? " (comma separated)" : ""}
          </label>
          {q.type === "textarea" ? (
            <textarea
              value={answers[q.key] || ""}
              placeholder={q.placeholder}
              onChange={(e) => onChange(q.key, e.target.value)}
            />
          ) : q.type === "select" ? (
            <select value={answers[q.key] || ""} onChange={(e) => onChange(q.key, e.target.value)}>
              <option value="">Select…</option>
              {(q.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={q.type === "number" ? "number" : "text"}
              value={answers[q.key] || ""}
              placeholder={q.placeholder}
              onChange={(e) => onChange(q.key, e.target.value)}
            />
          )}
        </div>
      ))}
    </>
  );
}
