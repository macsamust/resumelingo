import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { CollapsibleSection } from "../components/builder/CollapsibleSection";
import { DynamicQuestionForm } from "../components/builder/DynamicQuestionForm";
import { ExperienceEditor } from "../components/builder/ExperienceEditor";
import { EducationEditor } from "../components/builder/EducationEditor";
import { AwardsEditor } from "../components/builder/AwardsEditor";
import { AchievementEditor } from "../components/builder/AchievementEditor";
import { ResumePreview } from "../components/builder/ResumePreview";
import { ApiError, catalogApi, resumeApi } from "../api";
import {
  AchievementEntry,
  AwardEntry,
  EducationEntry,
  LinkVisibility,
  ProfessionDefinition,
  Resume,
  TemplateDefinition,
  WorkExperienceEntry,
} from "../types";

export function ResumeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [professionDetail, setProfessionDetail] = useState<ProfessionDefinition | null>(null);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactLinkedIn, setContactLinkedIn] = useState("");
  const [title, setTitle] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [visibility, setVisibility] = useState<LinkVisibility>("public");
  const [accessPassword, setAccessPassword] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [experience, setExperience] = useState<WorkExperienceEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [awards, setAwards] = useState<AwardEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([resumeApi.getById(id), catalogApi.listTemplates()])
      .then(([resumeRes, templatesRes]) => {
        const r = resumeRes.resume;
        setResume(r);
        setFullName(r.fullName);
        setContactEmail(r.contactEmail);
        setContactPhone(r.contactPhone);
        setContactLinkedIn(r.contactLinkedIn);
        setTitle(r.title);
        setTemplateKey(r.templateKey);
        setVisibility(r.visibility);
        setAnswers(r.answers);
        setExperience(r.experience);
        setEducation(r.education);
        setAwards(r.awards);
        setAchievements(r.achievements);
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
        fullName,
        contactEmail,
        contactPhone,
        contactLinkedIn,
        title,
        templateKey,
        visibility,
        accessPassword: visibility === "password" ? accessPassword : null,
        answers,
        experience,
        education,
        awards,
        achievements,
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
      <form id="resume-edit-form" onSubmit={onSubmit} className="builder-grid">
        <div className="builder-panel">
          <button className="btn btn-primary btn-block" type="submit" disabled={saving} style={{ marginBottom: 20 }}>
            {saving ? "Saving…" : "Save changes"}
          </button>

          <CollapsibleSection title="Details">
            <div className="field">
              <label>Your full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div className="field">
              <label>LinkedIn URL</label>
              <input
                value={contactLinkedIn}
                onChange={(e) => setContactLinkedIn(e.target.value)}
                placeholder="e.g. https://www.linkedin.com/in/jordanlee"
              />
            </div>
            <div className="field">
              <label>Resume title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Template">
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
          </CollapsibleSection>

          <CollapsibleSection title="Sharing">
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
            <p className="hero-note" style={{ marginBottom: 0 }}>
              {window.location.origin}/r/{resume.slug}
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Work Experience">
            <ExperienceEditor experience={experience} onChange={setExperience} />
          </CollapsibleSection>

          <CollapsibleSection title="Education">
            <EducationEditor education={education} onChange={setEducation} />
          </CollapsibleSection>

          <CollapsibleSection title="Awards">
            <AwardsEditor awards={awards} onChange={setAwards} />
          </CollapsibleSection>

          <CollapsibleSection title="Key Achievements">
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Describe a challenge, what you did, and the result — this is what turns into impact-focused resume bullets.
            </p>
            <AchievementEditor achievements={achievements} onChange={setAchievements} />
          </CollapsibleSection>

          <CollapsibleSection title="Answers">
            {professionDetail && (
              <DynamicQuestionForm
                questions={professionDetail.questions}
                answers={answers}
                onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
              />
            )}
          </CollapsibleSection>

          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        <ResumePreview
          fullName={fullName}
          contactEmail={contactEmail}
          contactPhone={contactPhone}
          contactLinkedIn={contactLinkedIn}
          title={title}
          professionLabel={resume.professionLabel}
          templateKey={templateKey}
          templateName={templates.find((t) => t.key === templateKey)?.name}
          summary={resume.generatedSummary}
          bullets={resume.generatedBullets}
          experience={experience}
          education={education}
          awards={awards}
        />
      </form>
      <p className="form-footnote">
        <Link to="/dashboard">← Back to dashboard</Link>
      </p>
    </AppShell>
  );
}
