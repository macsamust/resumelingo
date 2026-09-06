import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { CollapsibleSection, ForceOpenSignal } from "../components/builder/CollapsibleSection";
import { DynamicQuestionForm } from "../components/builder/DynamicQuestionForm";
import { ExperienceEditor } from "../components/builder/ExperienceEditor";
import { EducationEditor } from "../components/builder/EducationEditor";
import { AwardsEditor } from "../components/builder/AwardsEditor";
import { AchievementEditor } from "../components/builder/AchievementEditor";
import { AchievementGeneratorPanel } from "../components/builder/AchievementGeneratorPanel";
import { PhotoUploader } from "../components/builder/PhotoUploader";
import { ResumeImportPanel } from "../components/builder/ResumeImportPanel";
import { ResumePreview } from "../components/builder/ResumePreview";
import { ResumeEditSkeleton } from "../components/common/ResumeEditSkeleton";
import { ApiError, catalogApi, resumeApi } from "../api";
import { ImportedResumeData } from "../api/ResumeImportApi";
import { useAuth } from "../context/AuthContext";
import { canUseTemplate, CATEGORY_MIN_TIER, TIER_LABEL, templateHasSkillsAndTools } from "../utils/templateAccess";
import { titleCase } from "../utils/textFormat";
import { getTemplateStyle } from "../config/templateStyles";
import { isAtsSafeFamily } from "../utils/atsCheck";
import { withClearanceQuestion } from "../config/clearanceQuestion";
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
  const [templateKey, setTemplateKey] = useState("classic");
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
  // Highlights and Key Achievements are the same underlying list — a
  // "highlight" is just an achievement with only Action filled in (see
  // HighlightsEditor.tsx). Populated either by hand (Challenge/Action/Result
  // form) or by "Import an existing resume" below.
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [coverLetterEnabled, setCoverLetterEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forceOpen, setForceOpen] = useState<ForceOpenSignal | undefined>(undefined);

  // Checked up front, before the form renders at all — the server also
  // rejects a create() past the plan's resume limit (see ResumeService),
  // but that only surfaces as an error after someone has already filled out
  // the entire form and hit "Create my resume". Blocking here instead
  // means they never start filling it out only to be turned away at Save.
  const [limitStatus, setLimitStatus] = useState<{ reached: boolean; planName: string; resumeLimit: number } | null>(null);

  // One templateKey per profession — the most-used non-Classic template for
  // that profession, once it clears a minimum sample size. Feeds the dot
  // rendered in the template picker below (see popularTemplates on the worker).
  const [popularTemplates, setPopularTemplates] = useState<Record<string, string>>({});

  useEffect(() => {
    catalogApi
      .dashboardSummary()
      .then((res) => {
        const { unlimited, remaining, planName, resumeLimit } = res.subscription;
        setLimitStatus({ reached: !unlimited && remaining !== null && remaining <= 0, planName, resumeLimit });
      })
      .catch(() => setLimitStatus({ reached: false, planName: "", resumeLimit: 0 }));
  }, []);

  // The photo upload only applies to templates that actually render a photo
  // (Portrait, Designer, Monochrome, Showcase) — hidden for every other template.
  const PHOTO_FAMILIES = ["photo-banner-sidebar", "corner-photo-sidebar", "photo-sidebar-underline", "pill-grid-cards", "photo-header-list", "dark-card-grid", "bordered-ledger"];
  const usesPhoto = PHOTO_FAMILIES.includes(getTemplateStyle(templateKey).family);

  // "Generate AI cover letter" is only offered for Premium-tier templates —
  // enforced again server-side (see ResumeService), this just keeps the
  // checkbox from appearing for a template that can't use it.
  const selectedTemplateIsPremium = templates.find((t) => t.key === templateKey)?.category === "premium";

  // Gate for both "Import an existing resume" and "Generate from keywords" —
  // same Professional/Premium tier as Resume Import (see worker's
  // ResumeImportController/AchievementGenerateController).
  const canUseAiAssist = user?.subscriptionTier === "professional" || user?.subscriptionTier === "premium";

  useEffect(() => {
    catalogApi.listProfessions().then((res) => {
      setProfessions(res.professions);
      if (res.professions.length > 0) setProfessionKey(res.professions[0].key);
    });
    catalogApi.listTemplates().then((res) => setTemplates(res.templates));
    catalogApi.popularTemplatesByProfession().then((res) => setPopularTemplates(res.popularTemplates));
  }, []);

  useEffect(() => {
    if (!professionKey) return;
    setAnswers({});
    catalogApi.getProfessionQuestions(professionKey).then((res) => setProfessionDetail(res.profession));
  }, [professionKey]);

  // Switching to a non-Premium template hides the checkbox — also uncheck
  // it, so it doesn't stay silently "on" in state for a template that can't use it.
  useEffect(() => {
    if (!selectedTemplateIsPremium) setCoverLetterEnabled(false);
  }, [selectedTemplateIsPremium]);

  // Drives each accordion section's progress dot (see CollapsibleSection's
  // `complete` prop) — same lightweight "has anything meaningful been
  // entered" check ResumeEditPage's sectionProgress uses, trimmed to just
  // the sections this page has.
  // requiredComplete/requiredTotal mirror ResumeEditPage's sectionProgress —
  // only the sections that meaningfully affect the generated resume (Info,
  // Work Experience, Education, Highlights & Achievements) count toward the
  // fraction. Awards and "Answer a few questions" are explicitly optional on
  // this page (see their hero-note copy below) — unlike Edit Resume, neither
  // gets a progress glyph here either, so every glyph shown maps 1:1 to the
  // "X of Y sections complete" count instead of a glyph appearing on a
  // section that isn't actually counted.
  const sectionProgress = useMemo(() => {
    const info = fullName.trim() !== "" && contactEmail.trim() !== "" && title.trim() !== "";
    const workExperience = experience.some((e) => e.company.trim() !== "" && e.title.trim() !== "");
    const educationDone = education.some((e) => e.school.trim() !== "" || e.degree.trim() !== "" || e.fieldOfStudy.trim() !== "");
    const achievementsDone = achievements.some(
      (a) => a.challenge.trim() !== "" || a.action.trim() !== "" || a.result.trim() !== ""
    );

    const required = [info, workExperience, educationDone, achievementsDone];

    return {
      info,
      workExperience,
      education: educationDone,
      achievements: achievementsDone,
      requiredComplete: required.filter(Boolean).length,
      requiredTotal: required.length,
    };
  }, [fullName, contactEmail, title, experience, education, achievements]);

  // Same profession-plus-Govt-Contractor-template merge as ResumeEditPage —
  // see config/clearanceQuestion.ts.
  const additionalQuestions = useMemo(
    () => withClearanceQuestion(professionDetail?.questions ?? [], templateKey),
    [professionDetail, templateKey]
  );

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
        coverLetterEnabled,
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

  if (!limitStatus) {
    return (
      <AppShell>
        <ResumeEditSkeleton />
      </AppShell>
    );
  }

  if (limitStatus.reached) {
    return (
      <AppShell>
        <div className="app-page-head">
          <h1>New Resume</h1>
        </div>
        <div className="empty-state">
          <p>
            Your {limitStatus.planName} plan is limited to {limitStatus.resumeLimit} resume(s), and you've reached
            that limit. Upgrade your plan to create another, or delete an existing resume to free up a slot.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
            <Link to="/#pricing" className="btn btn-primary">
              Upgrade plan
            </Link>
            <Link to="/dashboard" className="btn btn-ghost">
              Back to dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="app-page-head">
        <h1>New Resume</h1>
      </div>
      {error && <div className="form-error">{error}</div>}
      <ResumeImportPanel
        canImport={canUseAiAssist}
        onImported={(data: ImportedResumeData) => {
          // Only overwrite a field the import actually found something for —
          // e.g. contactEmail already defaults to the account's email above,
          // and an empty import result shouldn't blank that out.
          if (data.fullName) setFullName(data.fullName);
          if (data.contactEmail) setContactEmail(data.contactEmail);
          if (data.contactPhone) setContactPhone(data.contactPhone);
          if (data.contactLinkedIn) setContactLinkedIn(data.contactLinkedIn);
          if (data.experience.length > 0) setExperience(data.experience);
          if (data.education.length > 0) setEducation(data.education);
          if (data.awards.length > 0) setAwards(data.awards);
          if (data.achievements.length > 0) setAchievements(data.achievements);
        }}
      />
      <form onSubmit={onSubmit} className="builder-grid">
        <div className="builder-panel">
          <div className="builder-progress">
            <div className="builder-progress-label">
              <span>Resume Build Progress</span>
              <span>
                {sectionProgress.requiredComplete} of {sectionProgress.requiredTotal} sections complete
              </span>
            </div>
            <div className="builder-progress-track">
              <div
                className="builder-progress-fill"
                style={{ width: `${(sectionProgress.requiredComplete / Math.max(1, sectionProgress.requiredTotal)) * 100}%` }}
              />
            </div>
          </div>

          <div className="builder-toggle-all">
            <button type="button" onClick={() => setForceOpen({ open: true, token: Date.now() })}>
              Expand all
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => setForceOpen({ open: false, token: Date.now() })}>
              Collapse all
            </button>
          </div>

          <CollapsibleSection title="1. Tell us about the role" forceOpen={forceOpen} complete={sectionProgress.info}>
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
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={(e) => setTitle(titleCase(e.target.value))}
                placeholder="e.g. Cloud Architect Resume"
              />
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
          </CollapsibleSection>

          <CollapsibleSection title="2. Choose a template" forceOpen={forceOpen} defaultOpen={true}>
            <div className="template-choices">
              {templates.map((t) => {
                const locked = !!user && !canUseTemplate(user.subscriptionTier, t.category);
                const tier = CATEGORY_MIN_TIER[t.category];
                const upgradeHint = `Upgrade to ${TIER_LABEL[tier]} to use this template.`;
                const atsSafe = isAtsSafeFamily(getTemplateStyle(t.key).family);
                const isPopular = !!professionKey && popularTemplates[professionKey] === t.key;
                const professionLabel = professions.find((p) => p.key === professionKey)?.label ?? "your profession";
                // Text fallback for the tier dot/ATS tag, which are otherwise
                // color- and (for the dot) aria-hidden-only — so someone
                // relying on a screen reader, or who hasn't learned what the
                // dot colors mean, still gets tier + ATS info via the title.
                const tierNote = `${TIER_LABEL[tier]} template.${atsSafe ? " ATS friendly (single column layout)." : ""}${isPopular ? ` Most popular with ${professionLabel}.` : ""}`;
                return (
                  <span
                    key={t.key}
                    className={`template-pill ${templateKey === t.key ? "active" : ""} ${locked ? "locked" : ""} ${isPopular ? "template-pill-popular" : ""}`}
                    onClick={() => {
                      if (!locked) setTemplateKey(t.key);
                    }}
                    title={locked ? `${upgradeHint} ${t.description}` : `${tierNote} ${t.description}`}
                  >
                    <span className={`template-pill-tier template-pill-tier-${tier}`} aria-hidden="true" />
                    {atsSafe && <span className="template-pill-ats-dot" aria-hidden="true" />}
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
            <div className="template-legend">
              <div className="template-legend-dots">
                <span>
                  <span className="template-pill-tier template-pill-tier-starter" aria-hidden="true" />
                  Starter
                </span>
                <span>
                  <span className="template-pill-tier template-pill-tier-professional" aria-hidden="true" />
                  Professional
                </span>
                <span>
                  <span className="template-pill-tier template-pill-tier-premium" aria-hidden="true" />
                  Premium
                </span>
                <span>
                  <span className="template-pill-ats-dot" aria-hidden="true" />
                  ATS friendly
                </span>
              </div>
              <span className="template-pill-popular">Most popular with your profession</span>
            </div>
            {usesPhoto && <PhotoUploader value={photoUrl} onChange={setPhotoUrl} />}
            {selectedTemplateIsPremium && (
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={coverLetterEnabled}
                  onChange={(e) => setCoverLetterEnabled(e.target.checked)}
                />
                Generate an AI cover letter for this resume
              </label>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="3. Work experience" forceOpen={forceOpen} complete={sectionProgress.workExperience}>
            <ExperienceEditor experience={experience} onChange={setExperience} />
          </CollapsibleSection>

          <CollapsibleSection title="4. Education" forceOpen={forceOpen} complete={sectionProgress.education}>
            <EducationEditor education={education} onChange={setEducation} />
          </CollapsibleSection>

          <CollapsibleSection
            title="5. Highlights & key achievements"
            forceOpen={forceOpen}
            complete={sectionProgress.achievements}
          >
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Add a quick one line bullet, or describe a challenge, what you did, and the result for a more detailed,
              structured accomplishment; both turn into resume bullets.
            </p>
            <AchievementGeneratorPanel
              canGenerate={canUseAiAssist}
              professionLabel={professionDetail?.label ?? ""}
              jobTitle={experience[0]?.title || undefined}
              onGenerated={(generated) => setAchievements((prev) => [...prev, ...generated])}
            />
            <AchievementEditor
              achievements={achievements}
              onChange={setAchievements}
              experience={experience}
              showJobLink={false}
            />
          </CollapsibleSection>

          <CollapsibleSection title="6. Awards" forceOpen={forceOpen} defaultOpen={false}>
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Optional: you can always add these later from the Edit Resume page.
            </p>
            <AwardsEditor awards={awards} onChange={setAwards} />
          </CollapsibleSection>

          <CollapsibleSection title="7. Answer a few questions" forceOpen={forceOpen} defaultOpen={false}>
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Optional: a few profession specific prompts to help sharpen your summary.
            </p>
            {additionalQuestions.length > 0 && (
              <DynamicQuestionForm
                questions={additionalQuestions}
                answers={answers}
                onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
              />
            )}
          </CollapsibleSection>

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting || !professionKey} style={{ marginTop: 20 }}>
            {submitting ? "Generating your resume…" : "Create my resume"}
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
          showSkillsAndTools={templateHasSkillsAndTools(templateKey)}
          securityClearance={answers.clearanceLevel}
        />
      </form>
    </AppShell>
  );
}
