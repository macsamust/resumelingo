import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { CollapsibleSection, ForceOpenSignal } from "../components/builder/CollapsibleSection";
import { DynamicQuestionForm } from "../components/builder/DynamicQuestionForm";
import { ExperienceEditor } from "../components/builder/ExperienceEditor";
import { EducationEditor } from "../components/builder/EducationEditor";
import { CopyFromResume } from "../components/builder/CopyFromResume";
import { AwardsEditor } from "../components/builder/AwardsEditor";
import { AchievementEditor } from "../components/builder/AchievementEditor";
import { SkillsAndToolsEditor } from "../components/builder/SkillsAndToolsEditor";
import { ReferencesEditor } from "../components/builder/ReferencesEditor";
import { PhotoUploader } from "../components/builder/PhotoUploader";
import { ResumePreview } from "../components/builder/ResumePreview";
import { ResumeEditSkeleton } from "../components/common/ResumeEditSkeleton";
import { VersionHistoryPanel } from "../components/common/VersionHistoryPanel";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { ApiError, catalogApi, resumeApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { canUseTemplate, CATEGORY_MIN_TIER, TIER_LABEL } from "../utils/templateAccess";
import { canUseVisibility, VISIBILITY_LABEL, VISIBILITY_MIN_TIER } from "../utils/visibilityAccess";
import { getTemplateStyle } from "../config/templateStyles";
import { buildResumeTextBlob, matchKeywords, runHealthChecks } from "../utils/atsCheck";
import { CLEARANCE_OPTIONS, REMOTE_PREFERENCE_OPTIONS, WORK_AUTHORIZATION_OPTIONS } from "../config/recruiterOptions";
import { generateId } from "../utils/id";
import { clearDraft, loadDraft, ResumeDraft, saveDraft } from "../utils/resumeDraft";
import {
  AchievementEntry,
  AwardEntry,
  EducationEntry,
  LinkVisibility,
  ProfessionDefinition,
  ProfessionSummary,
  ReferenceEntry,
  Resume,
  SkillOrTool,
  TemplateDefinition,
  WorkExperienceEntry,
} from "../types";

/** Display order for the Link visibility <select> — cheapest/most-available tier first. */
const VISIBILITY_OPTIONS: LinkVisibility[] = ["public", "private", "password"];

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
  const [skillsAndTools, setSkillsAndTools] = useState<SkillOrTool[]>([]);
  const [coverLetterEnabled, setCoverLetterEnabled] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [recruiterModeEnabled, setRecruiterModeEnabled] = useState(false);
  const [recruiterLocation, setRecruiterLocation] = useState("");
  const [recruiterAvailability, setRecruiterAvailability] = useState("");
  const [recruiterClearance, setRecruiterClearance] = useState("");
  const [recruiterWorkAuthorization, setRecruiterWorkAuthorization] = useState("");
  const [recruiterExpectedSalary, setRecruiterExpectedSalary] = useState("");
  const [recruiterRemotePreference, setRecruiterRemotePreference] = useState("");
  const [referencesEnabled, setReferencesEnabled] = useState(false);
  const [references, setReferences] = useState<ReferenceEntry[]>([]);
  const [referencesRecruiterModeOnly, setReferencesRecruiterModeOnly] = useState(false);
  const [combineExperienceFormat, setCombineExperienceFormat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forceOpen, setForceOpen] = useState<ForceOpenSignal | undefined>(undefined);
  const [showBackToTop, setShowBackToTop] = useState(false);
  // The user's other resumes (this one excluded) — powers "Copy from
  // another resume" in Work Experience/Education and the Company/Title/
  // School autocomplete suggestions below. Fetched once on load; a stale
  // list (from creating another resume in a different tab mid-edit) is an
  // acceptable tradeoff for not re-fetching on every keystroke.
  const [otherResumes, setOtherResumes] = useState<Resume[]>([]);
  // A locally-autosaved draft found on load that's newer than this resume's
  // last real save — offered via a banner rather than silently applied, so
  // a leftover draft can never clobber data the user (or another
  // tab/device) actually saved more recently. See utils/resumeDraft.ts.
  const [pendingDraft, setPendingDraft] = useState<ResumeDraft | null>(null);

  // Shows the floating "back to top" button once the page's own header has
  // scrolled out of view, so it's not just sitting on top of it uselessly.
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ATS Check is a Premium perk, matching the marketing/pricing copy — see
  // client/src/utils/atsCheck.ts for why this stays entirely client-side
  // (no save, no network call, nothing to protect server-side).
  const isPremium = user?.subscriptionTier === "premium";

  // Version History is a Professional/Premium perk — same tier as Clone,
  // the closest existing "extra copy of your work" feature. Enforced again
  // server-side (see ResumeService.assertVersionHistoryAllowed); this just
  // keeps the section from appearing for an account that can't use it.
  const canUseVersionHistory = user?.subscriptionTier === "professional" || isPremium;

  // The photo upload only applies to templates that actually render a photo
  // (Portrait, Designer, Monochrome, Showcase) — hidden for every other template.
  const PHOTO_FAMILIES = ["photo-banner-sidebar", "corner-photo-sidebar", "photo-sidebar-underline", "pill-grid-cards"];
  const usesPhoto = PHOTO_FAMILIES.includes(getTemplateStyle(templateKey || "modern").family);

  // "Generate AI cover letter" is only offered for Premium-tier templates —
  // enforced again server-side (see ResumeService), this just keeps the
  // checkbox from appearing for a template that can't use it.
  const selectedTemplateIsPremium = templates.find((t) => t.key === templateKey)?.category === "premium";

  // "Skills & Tools" is available on every Premium-tier template (Portrait,
  // Designer, Monochrome, Showcase, Federal, Creative, Academic,
  // Government Contractor, Military Transition — see ResumePreview.tsx,
  // which renders it in the spot that fits each template's own layout).
  // Selections are kept even if the template is switched to a non-Premium
  // one and back, same as every other builder field.
  const usesSkillsAndTools = selectedTemplateIsPremium;

  useEffect(() => {
    if (!id) return;
    Promise.all([resumeApi.getById(id), catalogApi.listTemplates(), catalogApi.listProfessions(), resumeApi.list()])
      .then(([resumeRes, templatesRes, professionsRes, allResumesRes]) => {
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
        setRecruiterModeEnabled(r.recruiterModeEnabled);
        setRecruiterLocation(r.recruiterLocation);
        setRecruiterAvailability(r.recruiterAvailability);
        setRecruiterClearance(r.recruiterClearance);
        setRecruiterWorkAuthorization(r.recruiterWorkAuthorization);
        setRecruiterExpectedSalary(r.recruiterExpectedSalary);
        setRecruiterRemotePreference(r.recruiterRemotePreference);
        setReferencesEnabled(r.referencesEnabled);
        setReferences(r.references);
        setReferencesRecruiterModeOnly(r.referencesRecruiterModeOnly);
        setCombineExperienceFormat(r.combineExperienceFormat);
        setAnswers(r.answers);
        // Backfill a stable id onto any job saved before WorkExperienceEntry.id
        // existed, so achievements can link to it via experienceId.
        setExperience(r.experience.map((job) => (job.id ? job : { ...job, id: generateId() })));
        setEducation(r.education);
        setAwards(r.awards);
        setAchievements(r.achievements);
        setSkillsAndTools(r.skillsAndTools);
        setTemplates(templatesRes.templates);
        setProfessions(professionsRes.professions);
        setProfessionKey(r.profession);
        setOtherResumes(allResumesRes.resumes.filter((other) => other.id !== r.id));

        // Offer to restore a local autosave only if it's actually newer than
        // this resume's last real save — otherwise it's a stale leftover
        // from before a save that already happened (here or on another
        // device/tab), and applying it would silently roll the resume back.
        const draft = loadDraft(r.id);
        if (draft && new Date(draft.savedAt).getTime() > new Date(r.updatedAt).getTime()) {
          setPendingDraft(draft);
        } else if (draft) {
          clearDraft(r.id);
        }

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

  /** Applies every field from a found local draft, then dismisses the banner. */
  const restoreDraft = () => {
    if (!pendingDraft) return;
    setFullName(pendingDraft.fullName);
    setContactEmail(pendingDraft.contactEmail);
    setContactPhone(pendingDraft.contactPhone);
    setContactLinkedIn(pendingDraft.contactLinkedIn);
    setPhotoUrl(pendingDraft.photoUrl);
    setTitle(pendingDraft.title);
    setTemplateKey(pendingDraft.templateKey);
    setVisibility(pendingDraft.visibility);
    setAccessPasswordExpiresAt(pendingDraft.accessPasswordExpiresAt);
    setAnswers(pendingDraft.answers);
    setExperience(pendingDraft.experience);
    setEducation(pendingDraft.education);
    setAwards(pendingDraft.awards);
    setAchievements(pendingDraft.achievements);
    setSkillsAndTools(pendingDraft.skillsAndTools);
    setCoverLetterEnabled(pendingDraft.coverLetterEnabled);
    setRecruiterModeEnabled(pendingDraft.recruiterModeEnabled);
    setRecruiterLocation(pendingDraft.recruiterLocation);
    setRecruiterAvailability(pendingDraft.recruiterAvailability);
    setRecruiterClearance(pendingDraft.recruiterClearance);
    setRecruiterWorkAuthorization(pendingDraft.recruiterWorkAuthorization);
    setRecruiterExpectedSalary(pendingDraft.recruiterExpectedSalary);
    setRecruiterRemotePreference(pendingDraft.recruiterRemotePreference);
    setReferencesEnabled(pendingDraft.referencesEnabled);
    setReferences(pendingDraft.references);
    setReferencesRecruiterModeOnly(pendingDraft.referencesRecruiterModeOnly);
    setCombineExperienceFormat(pendingDraft.combineExperienceFormat);
    if (pendingDraft.professionKey && pendingDraft.professionKey !== professionKey) {
      onProfessionChange(pendingDraft.professionKey);
    }
    setPendingDraft(null);
  };

  const discardDraft = () => {
    if (id) clearDraft(id);
    setPendingDraft(null);
  };

  // Autosaves a snapshot of the whole form to localStorage shortly after
  // each change, so closing the tab or a browser crash before hitting "Save
  // changes" doesn't lose the work — see utils/resumeDraft.ts. Skipped
  // entirely while the initial load is still in flight (nothing to save
  // yet) and while a just-found draft is awaiting the user's restore/discard
  // decision (autosaving here would immediately overwrite the very draft
  // being offered, with the pre-restore form state).
  useEffect(() => {
    if (loading || !id || pendingDraft) return;
    const handle = setTimeout(() => {
      saveDraft(id, {
        fullName,
        contactEmail,
        contactPhone,
        contactLinkedIn,
        photoUrl,
        title,
        professionKey,
        templateKey,
        visibility,
        accessPasswordExpiresAt,
        answers,
        experience,
        education,
        awards,
        achievements,
        skillsAndTools,
        coverLetterEnabled,
        recruiterModeEnabled,
        recruiterLocation,
        recruiterAvailability,
        recruiterClearance,
        recruiterWorkAuthorization,
        recruiterExpectedSalary,
        recruiterRemotePreference,
        referencesEnabled,
        references,
        referencesRecruiterModeOnly,
        combineExperienceFormat,
      });
    }, 800);
    return () => clearTimeout(handle);
  }, [
    loading,
    id,
    pendingDraft,
    fullName,
    contactEmail,
    contactPhone,
    contactLinkedIn,
    photoUrl,
    title,
    professionKey,
    templateKey,
    visibility,
    accessPasswordExpiresAt,
    answers,
    experience,
    education,
    awards,
    achievements,
    skillsAndTools,
    coverLetterEnabled,
    recruiterModeEnabled,
    recruiterLocation,
    recruiterAvailability,
    recruiterClearance,
    recruiterWorkAuthorization,
    recruiterExpectedSalary,
    recruiterRemotePreference,
    referencesEnabled,
    references,
    referencesRecruiterModeOnly,
    combineExperienceFormat,
  ]);

  // Whether this profession actually has any Additional Details questions —
  // some professions don't, in which case that section's progress dot is
  // omitted entirely rather than showing as permanently "incomplete".
  const professionHasQuestions = !!professionDetail && professionDetail.questions.length > 0;

  // Drives both the per-section progress dots (CollapsibleSection's
  // `complete` prop) and the "X of Y sections complete" summary near the
  // top of the form. `requiredComplete`/`requiredTotal` only count the
  // sections that meaningfully affect the generated resume — Awards,
  // Recruiter Mode, References, and Cover Letter are genuinely optional
  // extras, so they still get a dot for feedback but aren't part of the
  // fraction.
  const sectionProgress = useMemo(() => {
    const info = fullName.trim() !== "" && contactEmail.trim() !== "" && title.trim() !== "";
    const skills = skillsAndTools.length > 0;
    const workExperience = experience.some((e) => e.company.trim() !== "" && e.title.trim() !== "");
    const educationDone = education.some((e) => e.school.trim() !== "" || e.degree.trim() !== "" || e.fieldOfStudy.trim() !== "");
    const awardsDone = awards.some((a) => a.title.trim() !== "");
    const achievementsDone = achievements.some(
      (a) => a.challenge.trim() !== "" || a.action.trim() !== "" || a.result.trim() !== ""
    );
    const additionalDetails = professionHasQuestions
      ? professionDetail!.questions.some((q) => (answers[q.key] ?? "").trim() !== "")
      : false;
    const recruiterMode = recruiterModeEnabled;
    const referencesDone = referencesEnabled && references.length > 0;
    const coverLetter = coverLetterEnabled;

    const required = [info, workExperience, educationDone, achievementsDone];
    if (usesSkillsAndTools) required.push(skills);
    if (professionHasQuestions) required.push(additionalDetails);

    return {
      info,
      skills,
      workExperience,
      education: educationDone,
      awards: awardsDone,
      achievements: achievementsDone,
      additionalDetails,
      recruiterMode,
      references: referencesDone,
      coverLetter,
      requiredComplete: required.filter(Boolean).length,
      requiredTotal: required.length,
    };
  }, [
    fullName,
    contactEmail,
    title,
    skillsAndTools,
    experience,
    education,
    awards,
    achievements,
    professionHasQuestions,
    professionDetail,
    answers,
    recruiterModeEnabled,
    referencesEnabled,
    references,
    coverLetterEnabled,
    usesSkillsAndTools,
  ]);

  // Autocomplete suggestions for Company/Title (Work Experience) and School
  // (Education) — pulled from this resume's own other rows plus every other
  // resume the user has, via the native <input list="..."> + <datalist>
  // pattern (no client-side fuzzy-matching library needed, the browser
  // handles that). Kept simple as exact distinct strings, sorted for a
  // stable/predictable dropdown order.
  const companySuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const e of experience) if (e.company.trim()) set.add(e.company.trim());
    for (const r of otherResumes) for (const e of r.experience) if (e.company.trim()) set.add(e.company.trim());
    return Array.from(set).sort();
  }, [experience, otherResumes]);

  const titleSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const e of experience) if (e.title.trim()) set.add(e.title.trim());
    for (const r of otherResumes) for (const e of r.experience) if (e.title.trim()) set.add(e.title.trim());
    return Array.from(set).sort();
  }, [experience, otherResumes]);

  const schoolSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const e of education) if (e.school.trim()) set.add(e.school.trim());
    for (const r of otherResumes) for (const e of r.education) if (e.school.trim()) set.add(e.school.trim());
    return Array.from(set).sort();
  }, [education, otherResumes]);

  // Recomputed live from whatever's currently in the form — no save needed
  // to see an updated score, and nothing here ever leaves the browser.
  const healthCheck = useMemo(
    () =>
      runHealthChecks({
        contactEmail,
        contactPhone,
        templateFamily: getTemplateStyle(templateKey || "modern").family,
        experience,
        education,
        achievements,
        answers,
        summary: resume?.generatedSummary ?? "",
      }),
    [contactEmail, contactPhone, templateKey, experience, education, achievements, answers, resume?.generatedSummary]
  );

  const keywordMatch = useMemo(() => {
    if (!jobDescription.trim()) return null;
    const resumeText = buildResumeTextBlob({
      title,
      professionLabel: professionDetail?.label ?? resume?.professionLabel ?? "",
      summary: resume?.generatedSummary ?? "",
      bullets: resume?.generatedBullets ?? [],
      experience,
      education,
      awards,
      achievements,
      answers,
      // Was missing entirely — a skill already added here still showed up as
      // "missing" from a pasted job description, which undermined the whole
      // point of the check. Only relevant for templates that have this
      // section at all (see usesSkillsAndTools below).
      skillsAndTools: usesSkillsAndTools ? skillsAndTools : undefined,
    });
    return matchKeywords(jobDescription, resumeText);
  }, [
    jobDescription,
    title,
    professionDetail,
    resume,
    experience,
    education,
    awards,
    achievements,
    answers,
    usesSkillsAndTools,
    skillsAndTools,
  ]);

  /**
   * Turns a "missing from your resume" keyword into an actual tweak instead
   * of just a fact — adds it straight to Skills & Tools, same click-to-add
   * interaction SkillsAndToolsEditor already uses for its own suggestions.
   * Only offered when the current template has a Skills & Tools section at
   * all (usesSkillsAndTools) — otherwise there's nowhere for this to go.
   */
  const addKeywordToSkills = (word: string) => {
    const label = word.charAt(0).toUpperCase() + word.slice(1);
    setSkillsAndTools((prev) =>
      prev.some((s) => s.label.toLowerCase() === word.toLowerCase()) ? prev : [...prev, { label, category: "skill" }]
    );
  };

  // Logs the missing-keyword list (words only — the pasted job description
  // itself never leaves the browser) so the Premium dashboard's Resume
  // Analytics can surface which keywords a user keeps missing across job
  // postings. Debounced so it fires once typing/pasting settles, not on
  // every keystroke; fire-and-forget — a failed log shouldn't interrupt
  // editing, so errors are swallowed rather than surfaced.
  useEffect(() => {
    if (!id || !isPremium || !keywordMatch || keywordMatch.missing.length === 0) return;
    const handle = setTimeout(() => {
      resumeApi.recordKeywordCheck(id, keywordMatch.missing.map((k) => k.word)).catch(() => {});
    }, 1500);
    return () => clearTimeout(handle);
  }, [id, isPremium, keywordMatch]);

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
        recruiterModeEnabled,
        recruiterLocation,
        recruiterAvailability,
        recruiterClearance,
        recruiterWorkAuthorization,
        recruiterExpectedSalary,
        recruiterRemotePreference,
        combineExperienceFormat,
        answers,
        experience,
        education,
        awards,
        achievements,
        skillsAndTools,
        referencesEnabled,
        references,
        referencesRecruiterModeOnly,
      });
      setResume(updated);
      // Now safely persisted server-side — the local autosave would only be
      // stale from here on, and leaving it around would just prompt an
      // unnecessary "restore?" banner on the next visit.
      clearDraft(id);
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
        <ResumeEditSkeleton />
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

  const scrollToAtsCheck = () => {
    setForceOpen({ open: true, token: Date.now() });
    // Let the section actually expand before scrolling to it, otherwise a
    // just-opened section's height isn't accounted for in the scroll target.
    requestAnimationFrame(() => {
      document.getElementById("ats-check-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <AppShell>
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: resume.title || "Edit Resume" }]} />
      <div className="app-page-head">
        <h1 id="edit-resume-title">Edit Resume</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href={`/r/${resume.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost">
            View resume
          </a>
          <button className="btn btn-ghost" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      {pendingDraft && (
        <div className="draft-restore-banner">
          <span>You have unsaved changes from earlier — restore them?</span>
          <span className="draft-restore-banner-actions">
            <button type="button" className="draft-restore-banner-restore" onClick={restoreDraft}>
              Restore
            </button>
            <button type="button" className="draft-restore-banner-discard" onClick={discardDraft}>
              Discard
            </button>
          </span>
        </div>
      )}
      <form id="resume-edit-form" onSubmit={onSubmit} className="builder-grid">
        <div className="builder-panel">
          <button className="btn btn-primary btn-block" type="submit" disabled={saving} style={{ marginBottom: 20 }}>
            {saving ? "Saving…" : "Save changes"}
          </button>

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

          <CollapsibleSection title="Info" forceOpen={forceOpen} complete={sectionProgress.info}>
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
          </CollapsibleSection>

          {usesSkillsAndTools && (
            <CollapsibleSection title="Skills & Tools" forceOpen={forceOpen} complete={sectionProgress.skills}>
              <p className="hero-note" style={{ marginBottom: 16 }}>
                Available on every Premium template. Click a suggested keyword to add it — skills and tools are
                grouped separately in both the picker and the resume itself.
              </p>
              <SkillsAndToolsEditor
                professionKey={professionKey}
                professionLabel={professionDetail?.label ?? resume.professionLabel}
                value={skillsAndTools}
                onChange={setSkillsAndTools}
              />
            </CollapsibleSection>
          )}

          <CollapsibleSection title="Sharing" forceOpen={forceOpen}>
            <div className="field">
              <label>Link visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as LinkVisibility)}>
                {VISIBILITY_OPTIONS.map((v) => {
                  const locked = !!user && !canUseVisibility(user.subscriptionTier, v);
                  return (
                    <option key={v} value={v} disabled={locked}>
                      {VISIBILITY_LABEL[v]}
                      {locked ? ` — requires ${TIER_LABEL[VISIBILITY_MIN_TIER[v]]}` : ""}
                    </option>
                  );
                })}
              </select>
              <p className="hero-note" style={{ marginTop: 6, marginBottom: 0 }}>
                Starter plans get public links only. Professional adds private links, and Premium adds
                password-protected links.
              </p>
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

          <CollapsibleSection title="Work Experience" forceOpen={forceOpen} complete={sectionProgress.workExperience}>
            <CopyFromResume
              otherResumes={otherResumes}
              getItems={(r) => r.experience}
              transform={(entry) => ({ ...entry, id: generateId() })}
              onCopy={(items) => setExperience((prev) => [...prev, ...items])}
              label="Copy work experience from…"
            />
            <ExperienceEditor
              experience={experience}
              onChange={setExperience}
              companySuggestions={companySuggestions}
              titleSuggestions={titleSuggestions}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Education" forceOpen={forceOpen} complete={sectionProgress.education}>
            <CopyFromResume
              otherResumes={otherResumes}
              getItems={(r) => r.education}
              onCopy={(items) => setEducation((prev) => [...prev, ...items])}
              label="Copy education from…"
            />
            <EducationEditor education={education} onChange={setEducation} schoolSuggestions={schoolSuggestions} />
          </CollapsibleSection>

          <CollapsibleSection title="Awards" forceOpen={forceOpen} complete={sectionProgress.awards}>
            <AwardsEditor awards={awards} onChange={setAwards} />
          </CollapsibleSection>

          <CollapsibleSection title="Key Achievements" forceOpen={forceOpen} complete={sectionProgress.achievements}>
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Describe a challenge, what you did, and the result — this is what turns into impact-focused resume bullets.
            </p>
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

          <CollapsibleSection
            title="Additional Details"
            forceOpen={forceOpen}
            complete={professionHasQuestions ? sectionProgress.additionalDetails : undefined}
          >
            {professionDetail && (
              <DynamicQuestionForm
                questions={professionDetail.questions}
                answers={answers}
                onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
              />
            )}
          </CollapsibleSection>

          {isPremium && (
            <div className="builder-divider">
              <span className="builder-divider-label">Premium Tools</span>
            </div>
          )}

          {isPremium && (
            <div id="ats-check-section">
              <CollapsibleSection title="ATS Check" forceOpen={forceOpen}>
                <p className="hero-note" style={{ marginBottom: 16 }}>
                  An ATS (Applicant Tracking System) is the software many employers use to scan and rank resumes
                  before a person ever sees them. This check scores your resume's structure and compares it against a
                  job description's keywords, so you can see how it's likely to hold up.
                </p>
                <div className="ats-score-row">
                  <div className="ats-score-value">{healthCheck.score}%</div>
                  <p className="hero-note" style={{ margin: 0 }}>
                    Health Score — how well this resume's structure holds up to an ATS parser.
                  </p>
                </div>
                <ul className="ats-checklist">
                  {healthCheck.items.map((item) => (
                    <li key={item.id} className={item.passed ? "ats-pass" : "ats-fail"}>
                      <span aria-hidden="true">{item.passed ? "✓" : "✗"}</span> {item.label}
                      {!item.passed && <p className="hero-note" style={{ margin: "4px 0 0" }}>{item.hint}</p>}
                    </li>
                  ))}
                </ul>

                <div className="field" style={{ marginTop: 20 }}>
                  <label>Paste a job description for keyword matching</label>
                  <textarea
                    rows={6}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job posting text here…"
                  />
                </div>

                {keywordMatch && (
                  <div className="ats-keyword-results">
                    <div className="ats-score-row" style={{ marginTop: 0, marginBottom: 12 }}>
                      <div className="ats-score-value">
                        {Math.round(
                          (keywordMatch.matched.length / Math.max(1, keywordMatch.matched.length + keywordMatch.missing.length)) *
                            100
                        )}
                        %
                      </div>
                      <p className="hero-note" style={{ margin: 0 }}>
                        Job Match — matched {keywordMatch.matched.length} of{" "}
                        {keywordMatch.matched.length + keywordMatch.missing.length} top keywords from this job
                        description.
                      </p>
                    </div>
                    {keywordMatch.matched.length > 0 && (
                      <div className="ats-keyword-group">
                        <div className="ats-keyword-group-label">Found in your resume</div>
                        <div className="ats-keyword-chips">
                          {keywordMatch.matched.map((k) => (
                            <span key={k.word} className="ats-chip ats-chip-matched">
                              {k.word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {keywordMatch.missing.length > 0 && (
                      <div className="ats-keyword-group">
                        <div className="ats-keyword-group-label">
                          Missing from your resume
                          {usesSkillsAndTools && <span className="hero-note"> — click one to add it to Skills & Tools</span>}
                        </div>
                        <div className="ats-keyword-chips">
                          {keywordMatch.missing.map((k) =>
                            usesSkillsAndTools ? (
                              <button
                                type="button"
                                key={k.word}
                                className="ats-chip ats-chip-missing ats-chip-actionable"
                                onClick={() => addKeywordToSkills(k.word)}
                              >
                                {k.word} <span aria-hidden="true">+</span>
                              </button>
                            ) : (
                              <span key={k.word} className="ats-chip ats-chip-missing">
                                {k.word}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CollapsibleSection>
            </div>
          )}

          {isPremium && (
            <CollapsibleSection title="Recruiter Mode" forceOpen={forceOpen} complete={sectionProgress.recruiterMode}>
              <p className="hero-note" style={{ marginBottom: 16 }}>
                Adds a candidate summary card to the top of your public resume link — skills (pulled automatically
                from your resume), availability, clearance, location, work authorization, expected salary, and
                remote preference. Every field below is optional and stays off until you turn this on.
              </p>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={recruiterModeEnabled}
                  onChange={(e) => setRecruiterModeEnabled(e.target.checked)}
                />
                Enable Recruiter Mode for this resume
              </label>
              {recruiterModeEnabled && (
                <>
                  <div className="field">
                    <label>Location</label>
                    <input
                      value={recruiterLocation}
                      onChange={(e) => setRecruiterLocation(e.target.value)}
                      placeholder="e.g. Austin, TX (open to relocation)"
                    />
                  </div>
                  <div className="field">
                    <label>Availability</label>
                    <input
                      value={recruiterAvailability}
                      onChange={(e) => setRecruiterAvailability(e.target.value)}
                      placeholder="e.g. Immediately, or 2 weeks notice"
                    />
                  </div>
                  <div className="field">
                    <label>Expected salary</label>
                    <input
                      value={recruiterExpectedSalary}
                      onChange={(e) => setRecruiterExpectedSalary(e.target.value)}
                      placeholder="e.g. $120k–140k"
                    />
                  </div>
                  <div className="field">
                    <label>Security clearance</label>
                    <select value={recruiterClearance} onChange={(e) => setRecruiterClearance(e.target.value)}>
                      {CLEARANCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Work authorization</label>
                    <select
                      value={recruiterWorkAuthorization}
                      onChange={(e) => setRecruiterWorkAuthorization(e.target.value)}
                    >
                      {WORK_AUTHORIZATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Remote preference</label>
                    <select
                      value={recruiterRemotePreference}
                      onChange={(e) => setRecruiterRemotePreference(e.target.value)}
                    >
                      {REMOTE_PREFERENCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </CollapsibleSection>
          )}

          {isPremium && (
            <CollapsibleSection title="References" forceOpen={forceOpen} complete={sectionProgress.references}>
              <p className="hero-note" style={{ marginBottom: 16 }}>
                Adds a References section to your public resume link. Off by default — nothing appears until you
                turn this on and add at least one reference.
              </p>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={referencesEnabled}
                  onChange={(e) => setReferencesEnabled(e.target.checked)}
                />
                Add a References section to this resume
              </label>
              {referencesEnabled && (
                <>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={referencesRecruiterModeOnly}
                      onChange={(e) => setReferencesRecruiterModeOnly(e.target.checked)}
                    />
                    Only add references to Recruiter Mode printout section when selecting "View resume"
                  </label>
                  {referencesRecruiterModeOnly && !recruiterModeEnabled && (
                    <p className="hero-note" style={{ marginTop: -8, marginBottom: 16, color: "var(--muted)" }}>
                      References won't appear anywhere until Recruiter Mode is also turned on above.
                    </p>
                  )}
                  <ReferencesEditor references={references} onChange={setReferences} />
                </>
              )}
            </CollapsibleSection>
          )}

          {isPremium && selectedTemplateIsPremium && (
            <CollapsibleSection title="Cover Letter" forceOpen={forceOpen} complete={sectionProgress.coverLetter}>
              <p className="hero-note" style={{ marginBottom: 16 }}>
                Generates a tailored AI cover letter alongside this resume. Off by default — turn this on to have one
                written and kept in sync automatically.
              </p>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={coverLetterEnabled}
                  onChange={(e) => setCoverLetterEnabled(e.target.checked)}
                />
                Generate an AI cover letter for this resume
              </label>
              {coverLetterEnabled && (
                <>
                  {resume.coverLetterEnabled && resume.generatedCoverLetter ? (
                    <p className="hero-note" style={{ marginTop: 16, whiteSpace: "pre-line", color: "var(--navy-light)" }}>
                      {resume.generatedCoverLetter}
                    </p>
                  ) : (
                    <p className="hero-note" style={{ marginTop: 16 }}>
                      Your AI-generated cover letter will appear here after you save.
                    </p>
                  )}
                  <p className="hero-note" style={{ marginTop: 12, marginBottom: 0 }}>
                    Regenerates automatically whenever your name, title, profession, work experience, or answers
                    change.
                  </p>
                </>
              )}
            </CollapsibleSection>
          )}

          {canUseVersionHistory && (
            <CollapsibleSection title="Version History" forceOpen={forceOpen}>
              <p className="hero-note" style={{ marginBottom: 16 }}>
                A version is saved automatically every time you edit and save this resume — restore any of the last
                10 to undo changes.
              </p>
              {id && <VersionHistoryPanel resumeId={id} />}
            </CollapsibleSection>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={saving} style={{ marginTop: 28 }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        <div className="preview-col">
          {isPremium && (
            <div className="ats-mini-card">
              <div className="ats-mini-head">
                <span>
                  ATS check
                  <span className="info-tooltip" tabIndex={0}>
                    <span className="info-tooltip-icon" aria-hidden="true">?</span>
                    <span className="info-tooltip-bubble" role="tooltip">
                      This check scores your resume's structure and compares it against a job description's
                      keywords, so you can see how it's likely to hold up.
                    </span>
                  </span>
                </span>
                <span className="ats-mini-score">{healthCheck.score}%</span>
              </div>
              <ul className="ats-mini-list">
                {healthCheck.items.slice(0, 3).map((item) => (
                  <li key={item.id} className={item.passed ? "ats-pass" : "ats-fail"}>
                    <span aria-hidden="true">{item.passed ? "✓" : "✗"}</span> {item.label}
                  </li>
                ))}
              </ul>
              <a
                href="#ats-check-section"
                className="ats-mini-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToAtsCheck();
                }}
              >
                See full ATS Check ↓
              </a>
            </div>
          )}
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
            achievements={achievements}
            combineExperienceFormat={combineExperienceFormat}
            skillsAndTools={skillsAndTools}
            showSkillsAndTools={usesSkillsAndTools}
          />
        </div>
      </form>
      <p className="form-footnote">
        <Link to="/dashboard">← Back to dashboard</Link>
      </p>
      {showBackToTop && (
        <button
          type="button"
          className="back-to-top-fab"
          onClick={() => document.getElementById("edit-resume-title")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          title="Back to Edit Resume"
          aria-label="Back to Edit Resume"
        >
          ↑
        </button>
      )}
    </AppShell>
  );
}
