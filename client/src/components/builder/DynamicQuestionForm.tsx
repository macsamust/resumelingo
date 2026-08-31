import { ProfessionQuestion } from "../../types";

interface Props {
  questions: ProfessionQuestion[];
  answers: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

/**
 * Renders the "system interviews you" form: the question set changes
 * entirely based on which profession the user selected (see
 * config/professions.ts on the server, which is the source of truth).
 */
export function DynamicQuestionForm({ questions, answers, onChange }: Props) {
  return (
    <>
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
