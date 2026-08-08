import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { DynamicQuestionForm } from "../components/builder/DynamicQuestionForm";
import { ExperienceEditor } from "../components/builder/ExperienceEditor";
import { EducationEditor } from "../components/builder/EducationEditor";
import { AwardsEditor } from "../components/builder/AwardsEditor";
import { AchievementEditor } from "../components/builder/AchievementEditor";
import { PhotoUploader } from "../components/builder/PhotoUploader";
import { ResumePreview } from "../components/builder/ResumePreview";
import { ApiError, catalogApi, resumeApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { getTemplateStyle } from "../config/templateStyles";
import {
  AchievementEntry,
  AwardEntry,
  EducationEntry,
  ProfessionDefinition,
  ProfessionSummary,
  TemplateDefinition,
  WorkExperienceEntry,
} from "../types";

export function ResumeBuilderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [professions, setProfessions] = useState<ProfessionSummary[]>([]);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [professionKey, setProfessionKey] = useState("");
  const [professionDetail, setProfessionDetail] = useState<ProfessionDefinition | null>(null);
  const [templateKey, setTemplateKey] = useState("modern");
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [contactLinkedIn, setContactLinkedIn] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [experience, setExperience] = useState<WorkExperienceEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [awards, setAwards] = useState<AwardEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The photo upload only applies to the "Portrait" template's
  // photo-banner-sidebar layout — hidden for every other template since
  // they don't render a photo at all.
  const usesPhoto = getTemplateStyle(templateKey).family === "photo-banner-sidebar";

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
        fullName,
        contactEmail,
        contactPhone,
        contactLinkedIn,
        photoUrl,
        title: title || `${professionDetail?.label ?? "New"} Resume`,
        profession: professionKey,
        templateKey,
        answers,
        experience,
        education,
        awards,
        achievements,
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
            <label>Your full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jordan Lee" />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="e.g. jordan@example.com"
            />
          </div>
          <div className="field">
            <label>Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="e.g. (555) 123-4567"
            />
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
          {usesPhoto && <PhotoUploader value={photoUrl} onChange={setPhotoUrl} />}

          <h2>3. Work experience</h2>
          <ExperienceEditor experience={experience} onChange={setExperience} />

          <h2>4. Education</h2>
          <EducationEditor education={education} onChange={setEducation} />

          <h2>5. Awards</h2>
          <AwardsEditor awards={awards} onChange={setAwards} />

          <h2>6. Key achievements</h2>
          <p className="hero-note" style={{ marginBottom: 16 }}>
            Describe a challenge, what you did, and the result — this is what turns into impact-focused resume bullets.
          </p>
          <AchievementEditor achievements={achievements} onChange={setAchievements} />

          <h2>7. Answer a few questions</h2>
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
          fullName={fullName}
          contactEmail={contactEmail}
          contactPhone={contactPhone}
          contactLinkedIn={contactLinkedIn}
          photoUrl={photoUrl}
          title={title}
          professionLabel={professionDetail?.label ?? ""}
          templateKey={templateKey}
          templateName={templates.find((t) => t.key === templateKey)?.name}
          summary=""
          bullets={[]}
          experience={experience}
          education={education}
          awards={awards}
        />
      </form>
    </AppShell>
  );
}
