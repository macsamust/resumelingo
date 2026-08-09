import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { CollapsibleSection, ForceOpenSignal } from "../components/builder/CollapsibleSection";
import { DynamicQuestionForm } from "../components/builder/DynamicQuestionForm";
import { ExperienceEditor } from "../components/builder/ExperienceEditor";
import { EducationEditor } from "../components/builder/EducationEditor";
import { AwardsEditor } from "../components/builder/AwardsEditor";
import { AchievementEditor } from "../components/builder/AchievementEditor";
import { PhotoUploader } from "../components/builder/PhotoUploader";
import { ResumePreview } from "../components/builder/ResumePreview";
import { ApiError, catalogApi, resumeApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { canUseTemplate, CATEGORY_MIN_TIER, TIER_LABEL } from "../utils/templateAccess";
import { getTemplateStyle } from "../config/templateStyles";
import {
  AchievementEntry,
  AwardEntry,
  EducationEntry,
  LinkVisibility,
  ProfessionDefinition,
  ProfessionSummary,
  Resume,
  TemplateDefinition,
  WorkExperienceEntry,
} from "../types";

/** "2024-06-01T14:30:00.000Z" -> "2024-06-01T14:30" (local time) for a `<input type="datetime-local">`'s value. Empty string for a missing/invalid input. */
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ResumeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [professions, setProfessions] = useState<ProfessionSummary[]>([]);
  const [professionKey, setProfessionKey] = useState("");
  const [professionDetail, setProfessionDetail] = useState<ProfessionDefinition | null>(null);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactLinkedIn, setContactLinkedIn] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [visibility, setVisibility] = useState<LinkVisibility>("public");
  const [accessPassword, setAccessPassword] = useState("");
  // Local-time "datetime-local" input value, converted to/from ISO on load/save.
  const [accessPasswordExpiresAt, setAccessPasswordExpiresAt] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [experience, setExperience] = useState<WorkExperienceEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [awards, setAwards] = useState<AwardEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [coverLetterEnabled, setCoverLetterEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forceOpen, setForceOpen] = useState<ForceOpenSignal | undefined>(undefined);

  // The photo upload only applies to templates that actually render a photo
  // (Portrait, Designer, Monochrome, Showcase) — hidden for every other template.
  const PHOTO_FAMILIES = ["photo-banner-sidebar", "corner-photo-sidebar", "photo-sidebar-underline", "pill-grid-cards"];
  const usesPhoto = PHOTO_FAMILIES.includes(getTemplateStyle(templateKey || "modern").family);

  // "Generate AI cover letter" is only offered for Premium-tier templates —
  // enforced again server-side (see ResumeService), this just keeps the
  // checkbox from appearing for a template that can't use it.
  const selectedTemplateIsPremium = templates.find((t) => t.key === templateKey)?.category === "premium";

  useEffect(() => {
    if (!id) return;
    Promise.all([resumeApi.getById(id), catalogApi.listTemplates(), catalogApi.listProfessions()])
      .then(([resumeRes, templatesRes, professionsRes]) => {
        const r = resumeRes.resume;
        setResume(r);
        setFullName(r.fullName);
        setContactEmail(r.contactEmail);
        setContactPhone(r.contactPhone);
        setContactLinkedIn(r.contactLinkedIn);
        setPhotoUrl(r.photoUrl);
        setTitle(r.title);
        setTemplateKey(r.templateKey);
        setVisibility(r.visibility);
        setAccessPasswordExpiresAt(r.accessPasswordExpiresAt ? isoToDatetimeLocal(r.accessPasswordExpiresAt) : "");
        setCoverLetterEnabled(r.coverLetterEnabled);
        setAnswers(r.answers);
        setExperience(r.experience);
        setEducation(r.education);
        setAwards(r.awards);
        setAchievements(r.achievements);
        setTemplates(templatesRes.templates);
        setProfessions(professionsRes.professions);
        setProfessionKey(r.profession);
        return catalogApi.getProfessionQuestions(r.profession);
      })
      .then((res) => setProfessionDetail(res.profession))
      .catch(() => setError("Couldn't load this resume."))
      .finally(() => setLoading(false));
  }, [id]);

  // Switching to a non-Premium template hides the checkbox — also uncheck
  // it, so it doesn't stay silently "on" in state for a template that can't
  // use it. Skipped until templates/resume have both loaded, so this
  // doesn't fire (and clobber the loaded value) before selectedTemplateIsPremium
  // is meaningful.
  useEffect(() => {
    if (loading || templates.length === 0) return;
    if (!selectedTemplateIsPremium) setCoverLetterEnabled(false);
  }, [selectedTemplateIsPremium, loading, templates.length]);

  // Switching profession swaps the question set below, so previously answered
  // questions that no longer apply are cleared rather than silently kept.
  const onProfessionChange = (key: string) => {
    setProfessionKey(key);
    setAnswers({});
    catalogApi.getProfessionQuestions(key).then((res) => setProfessionDetail(res.profession));
  };

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
        photoUrl,
        title,
        profession: professionKey,
        templateKey,
        visibility,
        accessPassword: visibility === "password" ? accessPassword : null,
        accessPasswordExpiresAt:
          visibility === "password" && accessPasswordExpiresAt ? new Date(accessPasswordExpiresAt).toISOString() : null,
        coverLetterEnabled,
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
            View resume
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

          <div className="builder-toggle-all">
            <button type="button" onClick={() => setForceOpen({ open: true, token: Date.now() })}>
              Expand all
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => setForceOpen({ open: false, token: Date.now() })}>
              Collapse all
            </button>
          </div>

          <CollapsibleSection title="Details" forceOpen={forceOpen}>
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
            {usesPhoto && <PhotoUploader value={photoUrl} onChange={setPhotoUrl} />}
            <div className="field">
              <label>Resume title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label>Profession</label>
              <select value={professionKey} onChange={(e) => onProfessionChange(e.target.value)}>
                {professions.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Template" forceOpen={forceOpen}>
            <div className="template-choices">
              {templates.map((t) => {
                const locked = !!user && !canUseTemplate(user.subscriptionTier, t.category);
                const upgradeHint = `Upgrade to ${TIER_LABEL[CATEGORY_MIN_TIER[t.category]]} to use this template.`;
                return (
                  <span
                    key={t.key}
                    className={`template-pill ${templateKey === t.key ? "active" : ""} ${locked ? "locked" : ""}`}
                    onClick={() => {
                      if (!locked) setTemplateKey(t.key);
                    }}
                    title={locked ? `${upgradeHint} ${t.description}` : t.description}
                  >
                    {t.name}
                    {locked && (
                      <span className="template-pill-lock" aria-hidden="true">
                        🔒
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
            {selectedTemplateIsPremium && (
              <label className="checkbox-field" style={{ marginTop: 12 }}>
                <input
                  type="checkbox"
                  checked={coverLetterEnabled}
                  onChange={(e) => setCoverLetterEnabled(e.target.checked)}
                />
                Generate an AI cover letter for this resume
              </label>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Sharing" forceOpen={forceOpen}>
            <div className="field">
              <label>Link visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as LinkVisibility)}>
                <option value="public">Public — anyone with the link</option>
                <option value="password">Password-protected</option>
                <option value="private">Private — owner only</option>
              </select>
            </div>
            {visibility === "password" && (
              <>
                <div className="field">
                  <label>Access password</label>
                  <input value={accessPassword} onChange={(e) => setAccessPassword(e.target.value)} placeholder="Set a password" />
                </div>
                <div className="field">
                  <label>Link expires (optional)</label>
                  <input
                    type="datetime-local"
                    value={accessPasswordExpiresAt}
                    onChange={(e) => setAccessPasswordExpiresAt(e.target.value)}
                  />
                  <p className="hero-note" style={{ marginTop: 6, marginBottom: 0 }}>
                    {accessPasswordExpiresAt
                      ? "After this time, the link stops working — even with the correct password."
                      : "Leave blank for a link that never expires."}
                  </p>
                  {resume.accessPasswordExpiresAt && new Date(resume.accessPasswordExpiresAt).getTime() < Date.now() && (
                    <p className="form-error" style={{ marginTop: 8, marginBottom: 0 }}>
                      This link's expiration has already passed — it's currently deactivated.
                    </p>
                  )}
                </div>
              </>
            )}
            <p className="hero-note" style={{ marginBottom: 0 }}>
              {window.location.origin}/r/{resume.slug}
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Work Experience" forceOpen={forceOpen}>
            <ExperienceEditor experience={experience} onChange={setExperience} />
          </CollapsibleSection>

          <CollapsibleSection title="Education" forceOpen={forceOpen}>
            <EducationEditor education={education} onChange={setEducation} />
          </CollapsibleSection>

          <CollapsibleSection title="Awards" forceOpen={forceOpen}>
            <AwardsEditor awards={awards} onChange={setAwards} />
          </CollapsibleSection>

          <CollapsibleSection title="Key Achievements" forceOpen={forceOpen}>
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Describe a challenge, what you did, and the result — this is what turns into impact-focused resume bullets.
            </p>
            <AchievementEditor achievements={achievements} onChange={setAchievements} />
          </CollapsibleSection>

          <CollapsibleSection title="Answers" forceOpen={forceOpen}>
            {professionDetail && (
              <DynamicQuestionForm
                questions={professionDetail.questions}
                answers={answers}
                onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
              />
            )}
          </CollapsibleSection>

          {resume.coverLetterEnabled && (
            <CollapsibleSection title="Cover Letter" forceOpen={forceOpen}>
              {resume.generatedCoverLetter ? (
                <p className="hero-note" style={{ whiteSpace: "pre-line", color: "var(--navy-light)" }}>
                  {resume.generatedCoverLetter}
                </p>
              ) : (
                <p className="hero-note">Your AI-generated cover letter will appear here after you save.</p>
              )}
              <p className="hero-note" style={{ marginTop: 12, marginBottom: 0 }}>
                Regenerates automatically whenever your name, title, profession, work experience, or answers change.
              </p>
            </CollapsibleSection>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        <ResumePreview
          fullName={fullName}
          contactEmail={contactEmail}
          contactPhone={contactPhone}
          contactLinkedIn={contactLinkedIn}
          photoUrl={photoUrl}
          title={title}
          professionLabel={professionDetail?.label ?? resume.professionLabel}
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
