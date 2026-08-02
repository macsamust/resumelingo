import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { DynamicQuestionForm } from "../components/builder/DynamicQuestionForm";
import { ResumePreview } from "../components/builder/ResumePreview";
import { ApiError, catalogApi, resumeApi } from "../api";
import { LinkVisibility, ProfessionDefinition, Resume, TemplateDefinition } from "../types";

export function ResumeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [professionDetail, setProfessionDetail] = useState<ProfessionDefinition | null>(null);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [title, setTitle] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [visibility, setVisibility] = useState<LinkVisibility>("public");
  const [accessPassword, setAccessPassword] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([resumeApi.getById(id), catalogApi.listTemplates()])
      .then(([resumeRes, templatesRes]) => {
        const r = resumeRes.resume;
        setResume(r);
        setTitle(r.title);
        setTemplateKey(r.templateKey);
        setVisibility(r.visibility);
        setAnswers(r.answers);
        setTemplates(templatesRes.templates);
        return catalogApi.getProfessionQuestions(r.profession);
      })
      .then((res) => setProfessionDetail(res.profession))
      .catch(() => setError("Couldn't load this resume."))
      .finally(() => setLoading(false));
  }, [id]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      const { resume: updated } = await resumeApi.update(id, {
        title,
        templateKey,
        visibility,
        accessPassword: visibility === "password" ? accessPassword : null,
        answers,
      });
      setResume(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong saving your resume.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!id || !confirm("Delete this resume? This cannot be undone.")) return;
    await resumeApi.remove(id);
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <AppShell>
        <div className="spinner-page">Loading resume…</div>
      </AppShell>
    );
  }

  if (!resume) {
    return (
      <AppShell>
        <div className="empty-state">{error || "Resume not found."}</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="app-page-head">
        <h1>Edit Resume</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <a href={`/r/${resume.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost">
            View public link
          </a>
          <button className="btn btn-ghost" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={onSubmit} className="builder-grid">
        <div className="builder-panel">
          <h2>Details</h2>
          <div className="field">
            <label>Resume title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <h2>Template</h2>
          <div className="template-choices">
            {templates.map((t) => (
              <span
                key={t.key}
                className={`template-pill ${templateKey === t.key ? "active" : ""}`}
                onClick={() => setTemplateKey(t.key)}
                title={t.description}
              >
                {t.name}
              </span>
            ))}
          </div>

          <h2>Sharing</h2>
          <div className="field">
            <label>Link visibility</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as LinkVisibility)}>
              <option value="public">Public — anyone with the link</option>
              <option value="password">Password-protected</option>
              <option value="private">Private — owner only</option>
            </select>
          </div>
          {visibility === "password" && (
            <div className="field">
              <label>Access password</label>
              <input value={accessPassword} onChange={(e) => setAccessPassword(e.target.value)} placeholder="Set a password" />
            </div>
          )}
          <p className="hero-note" style={{ marginBottom: 16 }}>
            {window.location.origin}/r/{resume.slug}
          </p>

          <h2>Answers</h2>
          {professionDetail && (
            <DynamicQuestionForm
              questions={professionDetail.questions}
              answers={answers}
              onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
            />
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        <ResumePreview
          title={title}
          professionLabel={resume.professionLabel}
          templateName={templates.find((t) => t.key === templateKey)?.name}
          summary={resume.generatedSummary}
          bullets={resume.generatedBullets}
        />
      </form>
      <p className="form-footnote">
        <Link to="/dashboard">← Back to dashboard</Link>
      </p>
    </AppShell>
  );
}
