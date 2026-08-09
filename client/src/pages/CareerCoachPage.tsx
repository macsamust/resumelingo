import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import { ApiError, careerCoachApi } from "../api";
import { CareerCoachAnswer } from "../api/CareerCoachApi";

const QUICK_QUESTIONS = ["What salary should I ask for?", "How do I answer this interview question?", "What certifications should I pursue?"];

interface Exchange {
  question: string;
  answer: CareerCoachAnswer;
}

function CareerCoachLocked() {
  return (
    <AppShell>
      <div className="app-page-head">
        <h1>Career Coach</h1>
      </div>
      <div className="empty-state">
        <p>The AI Career Coach is a Professional and Premium feature. Upgrade your plan to start asking questions.</p>
        <Link to="/dashboard" className="btn btn-primary">
          Upgrade my plan
        </Link>
      </div>
    </AppShell>
  );
}

/**
 * Rule-based Q&A tool, not tied to any resume — see
 * server/src/services/CareerCoachGenerator.ts for why this is deterministic
 * template matching rather than a real LLM call (no network AI dependency
 * anywhere in this app, and it keeps the feature free to run). Conversation
 * history is kept in local state only — nothing is saved server-side, so
 * reopening this page always starts fresh.
 */
export function CareerCoachPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && user.subscriptionTier === "starter") return <CareerCoachLocked />;

  const ask = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || asking) return;
    setError(null);
    setAsking(true);
    try {
      const answer = await careerCoachApi.ask(trimmed);
      setExchanges((prev) => [...prev, { question: trimmed, answer }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong asking that question.");
    } finally {
      setAsking(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(question);
  };

  return (
    <AppShell>
      <div className="app-page-head">
        <h1>Career Coach</h1>
      </div>
      <p className="hero-note" style={{ marginBottom: 20 }}>
        Ask about salary negotiation, interview prep, or which certifications to pursue. Nothing here is saved —
        reopening this page starts a fresh conversation.
      </p>
      {error && <div className="form-error">{error}</div>}

      <div className="coach-quick-questions">
        {QUICK_QUESTIONS.map((q) => (
          <button key={q} type="button" className="btn btn-ghost btn-sm" disabled={asking} onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>

      <div className="coach-thread">
        {exchanges.length === 0 && !asking && (
          <p className="hero-note" style={{ fontStyle: "italic" }}>
            Pick a question above, or type your own below.
          </p>
        )}
        {exchanges.map((ex, i) => (
          <div className="coach-exchange" key={i}>
            <p className="coach-question">{ex.question}</p>
            <div className="coach-answer">
              <p style={{ whiteSpace: "pre-line" }}>{ex.answer.answer}</p>
              {ex.answer.relatedLinks.length > 0 && (
                <p className="coach-related-links">
                  {ex.answer.relatedLinks.map((link) => (
                    <Link key={link.label} to={link.anchor ? `/career-center#${link.anchor}` : "/career-center"}>
                      {link.label} →
                    </Link>
                  ))}
                </p>
              )}
            </div>
          </div>
        ))}
        {asking && <p className="hero-note">Thinking…</p>}
      </div>

      <form onSubmit={onSubmit} className="coach-input-row">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a career question…"
          disabled={asking}
        />
        <button className="btn btn-primary" type="submit" disabled={asking || !question.trim()}>
          {asking ? "Asking…" : "Ask"}
        </button>
      </form>
    </AppShell>
  );
}
