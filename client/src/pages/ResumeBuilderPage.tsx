import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { DynamicQuestionForm } from "../components/builder/DynamicQuestionForm";
import { ResumePreview } from "../components/builder/ResumePreview";
import { ApiError, catalogApi, resumeApi } from "../api";
import { ProfessionDefinition, ProfessionSummary, TemplateDefinition } from "../types";

export function ResumeBuilderPage() {
  const navigate = useNavigate();
  const [professions, setProfessions] = useState<ProfessionSummary[]>([]);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [professionKey, setProfessionKey] = useState("");
  const [professionDetail, setProfessionDetail] = useState<ProfessionDefinition | null>(null);
  const [templateKey, setTemplateKey] = useState("modern");
  const [title, setTitle] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    catalogApi.listProfessions().then((res) => {
      setProfessions(res.professions);
      if (res.professions.length > 0) setProfessionKey(res.professions[0].key);
    });
    catalogApi.listTemplates().then((res) => setTemplates(res.templates));
  }, []);

  useEffect(() => {
    if (!professionKey) return;
    setAnswers({});
    catalogApi.getProfessionQuestions(professionKey).then((res) => setProfessionDetail(res.profession));
  }, [professionKey]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { resume } = await resumeApi.create({
        title: title || `${professionDetail?.label ?? "New"} Resume`,
        profession: professionKey,
        templateKey,
        answers,
      });
      navigate(`/resumes/${resume.id}/edit`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong creating your resume.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="app-page-head">
        <h1>New Resume</h1>
      </div>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={onSubmit} className="builder-grid">
        <div className="builder-panel">
          <h2>1. Tell us about the role</h2>
          <div className="field">
            <label>Resume title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cloud Architect Resume" />
          </div>
          <div className="field">
            <label>Profession</label>
            <select value={professionKey} onChange={(e) => setProfessionKey(e.target.value)}>
              {professions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <h2>2. Choose a template</h2>
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

          <h2>3. Answer a few questions</h2>
          {professionDetail && (
            <DynamicQuestionForm
              questions={professionDetail.questions}
              answers={answers}
              onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
            />
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting || !professionKey}>
            {submitting ? "Generating your resume…" : "Create my Websume"}
          </button>
        </div>

        <ResumePreview
          title={title}
          professionLabel={professionDetail?.label ?? ""}
          templateName={templates.find((t) => t.key === templateKey)?.name}
          summary=""
          bullets={[]}
        />
      </form>
    </AppShell>
  );
}
