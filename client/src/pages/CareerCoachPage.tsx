import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ParrotLogo } from "../components/brand/ParrotLogo";
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
        <h1>Ask Poly</h1>
      </div>
      <div className="empty-state">
        <div className="poly-row" style={{ justifyContent: "center" }}>
          <div className="poly-avatar-slot">
            <ParrotLogo size={40} decorative={false} />
          </div>
          <p style={{ margin: 0 }}>I'm Poly, your AI Career Coach — but I'm a Premium perk. Upgrade your plan and I'll start answering.</p>
        </div>
        <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 16 }}>
          Upgrade my plan
        </Link>
      </div>
    </AppShell>
  );
}

/**
 * AI-backed Q&A tool (Workers AI, see worker/src/services/CareerCoachGenerator.ts's
 * AiCareerCoachGenerator), not tied to any resume. Conversation history is
 * kept in local state only — nothing is saved server-side, so reopening this
 * page always starts fresh.
 */
export function CareerCoachPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && user.subscriptionTier !== "premium") return <CareerCoachLocked />;

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
        <h1>Ask Poly, your Career Coach</h1>
      </div>
      <p className="hero-note" style={{ marginBottom: 20 }}>
        Ask about salary negotiation, interview prep, or which certifications to pursue. Nothing here is saved.
        Reopening this page starts a fresh conversation.
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
          <div className="poly-row">
            <div className="poly-avatar-slot">
              <ParrotLogo size={32} decorative={false} />
            </div>
            <p className="hero-note poly-body" style={{ fontStyle: "italic" }}>
              Hey, I'm Poly — pick a question above, or type your own below, and I'll help you work through it.
            </p>
          </div>
        )}
        {exchanges.map((ex, i) => (
          <div className="coach-exchange" key={i}>
            <p className="coach-question">{ex.question}</p>
            <div className="coach-answer poly-row">
              <div className="poly-avatar-slot">
                <ParrotLogo size={32} decorative={false} />
              </div>
              <div className="poly-body">
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
          </div>
        ))}
        {asking && (
          <div className="hero-note poly-thinking">
            <ParrotLogo size={24} decorative={false} />
            <span>Poly is thinking…</span>
          </div>
        )}
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
