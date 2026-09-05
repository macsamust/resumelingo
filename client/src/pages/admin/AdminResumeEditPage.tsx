import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminShell } from "../../components/layout/AdminShell";
import { CollapsibleSection, ForceOpenSignal } from "../../components/builder/CollapsibleSection";
import { ExperienceEditor } from "../../components/builder/ExperienceEditor";
import { EducationEditor } from "../../components/builder/EducationEditor";
import { AwardsEditor } from "../../components/builder/AwardsEditor";
import { AchievementEditor } from "../../components/builder/AchievementEditor";
import { SkillsAndToolsEditor } from "../../components/builder/SkillsAndToolsEditor";
import { LanguagesEditor } from "../../components/builder/LanguagesEditor";
import { PhotoUploader } from "../../components/builder/PhotoUploader";
import { isRealContactValue, ResumePreview } from "../../components/builder/ResumePreview";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { useToast } from "../../components/common/Toast";
import { adminApi, ApiError, catalogApi } from "../../api";
import { templateHasSkillsAndTools } from "../../utils/templateAccess";
import { titleCase } from "../../utils/textFormat";
import { getTemplateStyle } from "../../config/templateStyles";
import { generateId } from "../../utils/id";
import {
  AchievementEntry,
  AwardEntry,
  EducationEntry,
  LanguageEntry,
  LinkVisibility,
  Resume,
  SkillOrTool,
  TemplateDefinition,
  WorkExperienceEntry,
} from "../../types";

const VISIBILITY_OPTIONS: LinkVisibility[] = ["public", "private", "password"];
const PHOTO_FAMILIES = ["photo-banner-sidebar", "corner-photo-sidebar", "photo-sidebar-underline", "pill-grid-cards", "photo-header-list", "dark-card-grid", "bordered-ledger"];

/**
 * Full content editor for any user's resume — a support-case tool that
 * previously didn't exist at all: the admin Resumes page could only view a
 * resume's metadata (title/template/visibility/views), never fix or redact
 * its actual content. Deliberately reuses the same editor subcomponents as
 * the subscriber's own Edit Resume page (ExperienceEditor, EducationEditor,
 * etc.) and saves through the same ResumeService.update — see worker's
 * AdminResumeController.update — so an admin edit still goes through every
 * existing rule (tier-gated templates/visibility, version history,
 * summary/bullets regeneration).
 *
 * Deliberately NOT included, to keep this focused on "fix a support case"
 * rather than reproducing the entire subscriber builder: Recruiter Mode,
 * References, Cover Letter generation, ATS Check, Version History browsing,
 * and local draft autosave. Those are either subscriber-tier perks tied to
 * the *admin's* lack of a subscription context, or conveniences that don't
 * make sense for an occasional admin edit.
 */
export function AdminResumeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [resume, setResume] = useState<Resume | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [forceOpen, setForceOpen] = useState<ForceOpenSignal | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactLinkedIn, setContactLinkedIn] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [visibility, setVisibility] = useState<LinkVisibility>("public");
  const [active, setActive] = useState(true);
  const [experience, setExperience] = useState<WorkExperienceEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [awards, setAwards] = useState<AwardEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [skillsAndTools, setSkillsAndTools] = useState<SkillOrTool[]>([]);
  const [languages, setLanguages] = useState<LanguageEntry[]>([]);
  const [combineExperienceFormat, setCombineExperienceFormat] = useState(false);
  // Direct text overrides — the one capability this editor has that the
  // subscriber's own Edit Resume page doesn't: hand-editing the AI-generated
  // summary/bullets text, for fixing a typo or redacting something without
  // waiting on regeneration. See ResumeService.update, which already accepts
  // these fields and only regenerates over them when answers/achievements/
  // profession/name/title change in the same request.
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [generatedBulletsText, setGeneratedBulletsText] = useState("");

  const selectedTemplateIsPremium = templates.find((t) => t.key === templateKey)?.category === "premium";
  // Per-template, independent of tier category — see templateHasSkillsAndTools.
  const usesSkillsAndTools = templateHasSkillsAndTools(templateKey);
  const usesPhoto = PHOTO_FAMILIES.includes(getTemplateStyle(templateKey || "modern").family);
  const generatedBullets = useMemo(
    () => generatedBulletsText.split("\n").map((l) => l.trim()).filter(Boolean),
    [generatedBulletsText]
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([adminApi.getResume(id), catalogApi.listTemplates()])
      .then(([resumeRes, templatesRes]) => {
        const r = resumeRes.resume;
        setResume(r);
        setOwnerName(resumeRes.ownerName);
        setOwnerEmail(resumeRes.ownerEmail);
        setFullName(r.fullName);
        // See ResumeEditPage's identical guard: filters out placeholder-
        // looking values (e.g. "[LinkedIn URL — optional]" copied verbatim
        // from a source document during AI import) so this form starts
        // genuinely empty rather than re-populating stale bracket text from
        // D1 on every load — the next save then persists the correction.
        setContactEmail(isRealContactValue(r.contactEmail) ? r.contactEmail : "");
        setContactPhone(isRealContactValue(r.contactPhone) ? r.contactPhone : "");
        setContactLinkedIn(isRealContactValue(r.contactLinkedIn) ? r.contactLinkedIn : "");
        setPhotoUrl(r.photoUrl);
        setTitle(r.title);
        setTemplateKey(r.templateKey);
        setVisibility(r.visibility);
        setActive(r.active);
        setExperience(r.experience.map((job) => (job.id ? job : { ...job, id: generateId() })));
        setEducation(r.education);
        setAwards(r.awards);
        setAchievements(r.achievements);
        setSkillsAndTools(r.skillsAndTools);
        setLanguages(r.languages);
        setCombineExperienceFormat(r.combineExperienceFormat);
        setGeneratedSummary(r.generatedSummary);
        setGeneratedBulletsText(r.generatedBullets.join("\n"));
        setTemplates(templatesRes.templates);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load this resume."))
      .finally(() => setLoading(false));
  }, [id]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      const { resume: updated } = await adminApi.updateResume(id, {
        fullName,
        contactEmail,
        contactPhone,
        contactLinkedIn,
        photoUrl,
        title,
        templateKey,
        visibility,
        active,
        combineExperienceFormat,
        experience,
        education,
        awards,
        achievements,
        skillsAndTools,
        languages,
        generatedSummary,
        generatedBullets,
      });
      setResume(updated);
      showToast("success", "Resume updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong saving this resume.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await adminApi.bulkDeleteResumes([id]);
      showToast("success", "Resume deleted.");
      navigate("/admin/resumes");
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't delete this resume.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AdminShell>
        <div className="app-page-head">
          <h1>Edit Resume</h1>
        </div>
        <p className="hero-note">Loading…</p>
      </AdminShell>
    );
  }

  if (!resume) {
    return (
      <AdminShell>
        <div className="empty-state">{error || "Resume not found."}</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>Edit Resume</h1>
        <div className="admin-page-head-actions">
          <a href={`/r/${resume.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost">
            View resume
          </a>
          <button className="btn btn-ghost admin-danger" type="button" onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        </div>
      </div>
      <p className="hero-note" style={{ marginBottom: 20 }}>
        Owner: {ownerName} ({ownerEmail}) ·{" "}
        <Link to={`/admin/resumes?q=${encodeURIComponent(ownerEmail)}`}>find their other resumes</Link>
      </p>
      {error && <div className="form-error">{error}</div>}

      <form onSubmit={onSubmit} className="builder-grid">
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

          <CollapsibleSection title="Info" forceOpen={forceOpen} defaultOpen={true}>
            <div className="field">
              <label>Full name</label>
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
              <input value={contactLinkedIn} onChange={(e) => setContactLinkedIn(e.target.value)} />
            </div>
            {usesPhoto && <PhotoUploader value={photoUrl} onChange={setPhotoUrl} />}
            <div className="field">
              <label>Resume title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={(e) => setTitle(titleCase(e.target.value))}
              />
            </div>
            <label className="checkbox-field">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Link active (unchecking pauses the public link without changing visibility settings)
            </label>
          </CollapsibleSection>

          <CollapsibleSection title="Template" forceOpen={forceOpen} defaultOpen={true}>
            <p className="hero-note" style={{ marginBottom: 16 }}>
              The owner's subscription tier still governs which templates are allowed. Assigning one their plan
              doesn't support will be rejected on save. Bump their tier from the Users page first if needed.
            </p>
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

          {usesSkillsAndTools && (
            <CollapsibleSection title="Skills & Tools" forceOpen={forceOpen} defaultOpen={true}>
              <SkillsAndToolsEditor
                professionKey={resume.profession}
                professionLabel={resume.professionLabel}
                value={skillsAndTools}
                onChange={setSkillsAndTools}
              />
            </CollapsibleSection>
          )}

          <CollapsibleSection title="Sharing" forceOpen={forceOpen} defaultOpen={true}>
            <div className="field">
              <label>Link visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as LinkVisibility)}>
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <p className="hero-note" style={{ marginTop: 6, marginBottom: 0 }}>
                Password protected links keep whatever password is already set. This editor doesn't change it.
              </p>
            </div>
            <p className="hero-note" style={{ marginBottom: 0 }}>
              {window.location.origin}/r/{resume.slug}
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Work Experience" forceOpen={forceOpen} defaultOpen={true}>
            <ExperienceEditor experience={experience} onChange={setExperience} />
          </CollapsibleSection>

          <CollapsibleSection title="Education" forceOpen={forceOpen} defaultOpen={true}>
            <EducationEditor education={education} onChange={setEducation} />
          </CollapsibleSection>

          <CollapsibleSection title="Awards" forceOpen={forceOpen} defaultOpen={false}>
            <AwardsEditor awards={awards} onChange={setAwards} />
          </CollapsibleSection>

          <CollapsibleSection title="Languages" forceOpen={forceOpen} defaultOpen={false}>
            <LanguagesEditor languages={languages} onChange={setLanguages} />
          </CollapsibleSection>

          <CollapsibleSection title="Highlights & Key Achievements" forceOpen={forceOpen} defaultOpen={true}>
            <label className="checkbox-field" style={{ marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={combineExperienceFormat}
                onChange={(e) => setCombineExperienceFormat(e.target.checked)}
              />
              Combine Work Experience with Achievements (nest each bullet under the job it belongs to)
            </label>
            <AchievementEditor
              achievements={achievements}
              onChange={setAchievements}
              experience={experience}
              showJobLink={combineExperienceFormat}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Generated Summary & Bullets" forceOpen={forceOpen} defaultOpen={false}>
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Direct text overrides, same panel subscribers now have on their own Edit Resume page. Saving here does
              not set summaryManuallyEdited (that flag is only set from the subscriber's own save action), so
              editing Work Experience, Education, or Achievements above and saving will still regenerate this text
              and discard a manual edit made here in the same save; edit either this section or the ones above, not
              both in one save.
            </p>
            <div className="field">
              <label>Summary</label>
              <textarea rows={4} value={generatedSummary} onChange={(e) => setGeneratedSummary(e.target.value)} />
            </div>
            <div className="field">
              <label>Bullets (one per line)</label>
              <textarea rows={6} value={generatedBulletsText} onChange={(e) => setGeneratedBulletsText(e.target.value)} />
            </div>
          </CollapsibleSection>

          <button className="btn btn-primary btn-block" type="submit" disabled={saving} style={{ marginTop: 28 }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        <div className="preview-col">
          <ResumePreview
            fullName={fullName}
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            contactLinkedIn={contactLinkedIn}
            photoUrl={photoUrl}
            title={title}
            professionLabel={resume.professionLabel}
            templateKey={templateKey}
            templateName={templates.find((t) => t.key === templateKey)?.name}
            summary={generatedSummary}
            bullets={generatedBullets}
            experience={experience}
            education={education}
            awards={awards}
            achievements={achievements}
            combineExperienceFormat={combineExperienceFormat}
            skillsAndTools={skillsAndTools}
            showSkillsAndTools={usesSkillsAndTools}
            languages={languages}
          />
        </div>
      </form>
      <p className="form-footnote">
        <Link to="/admin/resumes">← Back to Resumes</Link>
      </p>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete resume"
          message={`Permanently delete "${resume.title}"? This cannot be undone.`}
          confirmLabel={deleting ? "Deleting…" : "Delete"}
          danger
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </AdminShell>
  );
}
