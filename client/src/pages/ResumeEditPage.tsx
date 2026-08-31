import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { CollapsibleSection, ForceOpenSignal } from "../components/builder/CollapsibleSection";
import { DynamicQuestionForm } from "../components/builder/DynamicQuestionForm";
import { ExperienceEditor } from "../components/builder/ExperienceEditor";
import { EducationEditor } from "../components/builder/EducationEditor";
import { CopyFromResume } from "../components/builder/CopyFromResume";
import { AwardsEditor } from "../components/builder/AwardsEditor";
import { AchievementEditor } from "../components/builder/AchievementEditor";
import { AchievementGeneratorPanel } from "../components/builder/AchievementGeneratorPanel";
import { SkillsAndToolsEditor } from "../components/builder/SkillsAndToolsEditor";
import { LanguagesEditor } from "../components/builder/LanguagesEditor";
import { ReferencesEditor } from "../components/builder/ReferencesEditor";
import { PhotoUploader } from "../components/builder/PhotoUploader";
import { ResumePreview } from "../components/builder/ResumePreview";
import { ResumeEditSkeleton } from "../components/common/ResumeEditSkeleton";
import { VersionHistoryPanel } from "../components/common/VersionHistoryPanel";
import { ApiError, catalogApi, resumeApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { canUseTemplate, CATEGORY_MIN_TIER, TIER_LABEL } from "../utils/templateAccess";
import { canUseVisibility, VISIBILITY_LABEL, VISIBILITY_MIN_TIER } from "../utils/visibilityAccess";
import { getTemplateStyle } from "../config/templateStyles";
import { buildResumeTextBlob, isAtsSafeFamily, matchKeywords, runHealthChecks } from "../utils/atsCheck";
import { CLEARANCE_OPTIONS, REMOTE_PREFERENCE_OPTIONS, WORK_AUTHORIZATION_OPTIONS } from "../config/recruiterOptions";
import { generateId } from "../utils/id";
import { clearDraft, loadDraft, ResumeDraft, saveDraft } from "../utils/resumeDraft";
import {
  AchievementEntry,
  AwardEntry,
  EducationEntry,
  LanguageEntry,
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
  const [languages, setLanguages] = useState<LanguageEntry[]>([]);
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
  // Generated Summary & Bullets editing — deliberately kept outside the big
  // form's isDirty/autosave/localStorage-draft machinery above (see
  // buildSavePayload/handleFormBlur) since it saves itself immediately via
  // its own explicit "Save" / "Reset to auto-generated" actions rather than
  // on blur. See ResumeService.update's summaryManuallyEdited gate — saving
  // here marks the flag so an unrelated Work Experience/achievements/
  // profession/name/title edit elsewhere on this page won't silently
  // regenerate over it afterward.
  const [summaryDraft, setSummaryDraft] = useState("");
  const [bulletsDraftText, setBulletsDraftText] = useState("");
  const [summaryManuallyEdited, setSummaryManuallyEdited] = useState(false);
  const [summarySaving, setSummarySaving] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
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
  // Whether the form currently differs from what's actually saved on the
  // server — drives the beforeunload warning below. localStorage autosave
  // protects the *data* from a closed tab or crash, but it doesn't stop
  // someone from closing the tab thinking they'd hit "Save changes" when
  // they'd only autosaved locally, hence this separate, explicit signal.
  const [isDirty, setIsDirty] = useState(false);
  // Drives the small status line next to "Save changes" — reflects the
  // on-blur autosave below, separate from `saving` (which is specifically
  // the explicit button's own in-flight state).
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // True once the form has "settled" after a load/restore/discard — the
  // dirty-tracking effect below fires on that settling too (same
  // dependency list as autosave), and that first firing must not count as
  // a real edit or the warning would fire on a page that was never touched.
  const hasSettledRef = useRef(false);

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

  // Gate for "Generate from keywords" inside Highlights & Key Achievements —
  // same Professional/Premium tier as Resume Import (see worker's
  // AchievementGenerateController).
  const canUseAiAssist = user?.subscriptionTier === "professional" || user?.subscriptionTier === "premium";

  // Version History is now a Premium-only perk (moved off Professional —
  // see TODO.md). Enforced again server-side
  // (see ResumeService.assertVersionHistoryAllowed); this just keeps the
  // section from appearing for an account that can't use it.
  const canUseVersionHistory = isPremium;

  // References moved onto Professional too (previously Premium-only) —
  // same tier as Job Applications/Version History used to be. Enforced
  // again server-side (see ResumeService.update's referencesEnabled gate);
  // this just keeps the section from appearing for an account that can't
  // use it.
  const canUseReferences = user?.subscriptionTier === "professional" || isPremium;

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
        setLanguages(r.languages);
        setSummaryDraft(r.generatedSummary);
        setBulletsDraftText(r.generatedBullets.join("\n"));
        setSummaryManuallyEdited(r.summaryManuallyEdited);
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
    setLanguages(pendingDraft.languages ?? []); // ?? [] guards a draft saved before this field existed
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
        languages,
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
    languages,
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

  // Tracks whether the form has actually changed since it last matched the
  // server — same dependency list as the autosave effect above, since both
  // need to fire on exactly the same "something changed" signal. While
  // loading, or while a restore/discard decision is pending, any firing is
  // just the form settling into place rather than a real edit, so
  // hasSettledRef is reset and the very next firing after that is skipped
  // once rather than marked dirty.
  useEffect(() => {
    if (loading || pendingDraft) {
      hasSettledRef.current = false;
      return;
    }
    if (!hasSettledRef.current) {
      hasSettledRef.current = true;
      return;
    }
    setIsDirty(true);
    // A fresh edit makes a stale "Saved"/error message from before
    // misleading — clear it so the status line reflects the current,
    // not-yet-autosaved state until the next save actually completes.
    setAutoSaveState("idle");
  }, [
    loading,
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
    languages,
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

  // Warns before closing the tab, refreshing, or navigating to a different
  // site while there are unsaved changes — the autosave above protects the
  // *data*, but without this someone can still close the tab thinking a
  // change was actually saved when it was only saved locally. Browsers
  // ignore any custom message text and show their own wording, but still
  // require `returnValue` to be set for the native prompt to appear.
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Whether this profession actually has any Additional Details questions —
  // some professions don't, in which case that section's progress dot is
  // omitted entirely rather than showing as permanently "incomplete".
  const professionHasQuestions = !!professionDetail && professionDetail.questions.length > 0;

  // Drives both the per-section progress glyphs (CollapsibleSection's
  // `complete` prop) and the "X of Y sections complete" summary near the
  // top of the form. `requiredComplete`/`requiredTotal` only count the
  // sections that meaningfully affect the generated resume — Awards,
  // Languages, Recruiter Mode, References, and Cover Letter are genuinely
  // optional extras, so — matching New Resume's treatment of its own
  // optional sections — they don't get a glyph at all, keeping every glyph
  // shown mapped 1:1 to the fraction instead of one appearing on a section
  // that isn't actually counted.
  const sectionProgress = useMemo(() => {
    const info = fullName.trim() !== "" && contactEmail.trim() !== "" && title.trim() !== "";
    const skills = skillsAndTools.length > 0;
    const workExperience = experience.some((e) => e.company.trim() !== "" && e.title.trim() !== "");
    const educationDone = education.some((e) => e.school.trim() !== "" || e.degree.trim() !== "" || e.fieldOfStudy.trim() !== "");
    const achievementsDone = achievements.some(
      (a) => a.challenge.trim() !== "" || a.action.trim() !== "" || a.result.trim() !== ""
    );
    const additionalDetails = professionHasQuestions
      ? professionDetail!.questions.some((q) => (answers[q.key] ?? "").trim() !== "")
      : false;

    const required = [info, workExperience, educationDone, achievementsDone];
    if (usesSkillsAndTools) required.push(skills);
    if (professionHasQuestions) required.push(additionalDetails);

    return {
      info,
      skills,
      workExperience,
      education: educationDone,
      achievements: achievementsDone,
      additionalDetails,
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
    achievements,
    professionHasQuestions,
    professionDetail,
    answers,
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
      languages,
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
    languages,
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

  // Shared by the explicit "Save changes" button and the on-blur autosave
  // below, so the two paths can never drift out of sync with each other.
  const buildSavePayload = () => ({
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
    languages,
    referencesEnabled,
    references,
    referencesRecruiterModeOnly,
  });

  const persist = async () => {
    if (!id) return;
    const { resume: updated } = await resumeApi.update(id, buildSavePayload());
    setResume(updated);
    // Now safely persisted server-side — the local autosave would only be
    // stale from here on, and leaving it around would just prompt an
    // unnecessary "restore?" banner on the next visit.
    clearDraft(id);
    setIsDirty(false);
  };

  /** Saves the hand-edited Summary/Bullets text and marks it manually edited, so it survives an unrelated content edit elsewhere on this page (see ResumeService.update). */
  const saveSummary = async () => {
    if (!id) return;
    setSummaryError(null);
    setSummarySaving(true);
    try {
      const { resume: updated } = await resumeApi.update(id, {
        generatedSummary: summaryDraft,
        generatedBullets: bulletsDraftText.split("\n").map((l) => l.trim()).filter(Boolean),
        summaryManuallyEdited: true,
      });
      setResume(updated);
      setSummaryDraft(updated.generatedSummary);
      setBulletsDraftText(updated.generatedBullets.join("\n"));
      setSummaryManuallyEdited(updated.summaryManuallyEdited);
    } catch (err) {
      setSummaryError(err instanceof ApiError ? err.message : "Something went wrong saving your summary.");
    } finally {
      setSummarySaving(false);
    }
  };

  /**
   * Regenerates from profession + answers + achievements — discarding any
   * manual edit in the process, if there was one. Same request either way
   * (`{ summaryManuallyEdited: false }`); ResumeService.update's
   * resetToAutoGenerated branch always re-runs the AI generator on this
   * call regardless of whether anything else changed, so since Content
   * Generator moved to real Workers AI this now genuinely produces a
   * different summary/bullets each time, not just the same text restated.
   * Two labels for the one action (see the button below) since "regenerate"
   * and "reset to auto-generated" mean the same thing here, but only one of
   * those readings makes sense depending on whether there's a manual edit
   * to actually discard.
   */
  const regenerateSummary = async () => {
    if (!id) return;
    setSummaryError(null);
    setSummarySaving(true);
    try {
      const { resume: updated } = await resumeApi.update(id, { summaryManuallyEdited: false });
      setResume(updated);
      setSummaryDraft(updated.generatedSummary);
      setBulletsDraftText(updated.generatedBullets.join("\n"));
      setSummaryManuallyEdited(updated.summaryManuallyEdited);
    } catch (err) {
      setSummaryError(err instanceof ApiError ? err.message : "Something went wrong regenerating your summary.");
    } finally {
      setSummarySaving(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      await persist();
      setAutoSaveState("idle");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong saving your resume.");
    } finally {
      setSaving(false);
    }
  };

  // Autosaves to the server (not just localStorage) as soon as a field
  // loses focus, so "Save changes" becomes a manual fallback rather than
  // the only way changes actually persist. Debounced slightly so tabbing
  // quickly through several fields collapses into one request instead of
  // firing on every single blur. Skipped while an explicit save or another
  // autosave is already in flight (savingInFlightRef), while nothing has
  // actually changed (isDirty), and while a restore/discard decision on a
  // local draft is still pending — same guards the localStorage autosave
  // effect above uses, for the same reasons.
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingInFlightRef = useRef(false);

  const handleFormBlur = () => {
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    // Debounced (unlike flushPendingAutosave's immediate save below, used
    // when a click is about to take the person somewhere their typed change
    // needs to already be visible) — a plain blur while staying on this page
    // doesn't need to win a race against anything, so waiting briefly here
    // avoids firing a save on every single field-to-field tab press.
    autosaveTimeoutRef.current = setTimeout(flushPendingAutosave, 400);
  };

  // Always holds this render's latest save-relevant values, read from the
  // unmount cleanup below — that cleanup only runs once (empty dep array),
  // so without this it would forever see the very first render's stale
  // isDirty/id/buildSavePayload rather than whatever was true right before
  // the person navigated away.
  const latestSaveStateRef = useRef({ isDirty, id, pendingDraft, buildSavePayload });
  latestSaveStateRef.current = { isDirty, id, pendingDraft, buildSavePayload };

  useEffect(() => () => {
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    // Clicking "View resume" is covered by flushPendingAutosave firing
    // directly on click (that link opens a new tab and leaves this page
    // mounted, so there's no unmount to hook into). But every OTHER way of
    // leaving this page — "Back to dashboard", the navbar, browser back —
    // is a normal in-app navigation that unmounts this component right
    // away, which used to just cancel the pending debounced autosave above
    // outright, silently dropping whatever was just typed (e.g. a language
    // name) if the person navigated away before that timer fired. Firing a
    // final save here instead, straight through the API rather than
    // persist() (whose setResume/setIsDirty calls would warn about setting
    // state on an unmounted component), means the edit survives even when
    // nobody waited around for the debounce or clicked "Save changes".
    const { isDirty, id, pendingDraft, buildSavePayload } = latestSaveStateRef.current;
    if (isDirty && id && !pendingDraft) {
      resumeApi.update(id, buildSavePayload()).catch(() => {});
    }
  }, []);

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

  /**
   * "View resume" opens the public page in a new tab (target="_blank") while
   * this tab stays open and mounted — so it can't fall back on the
   * beforeunload warning, and it doesn't get to just wait for the normal
   * on-blur autosave either. The field the person was just typing in only
   * blurs at the same moment this link is clicked, which schedules the
   * usual 400ms-debounced autosave — but that timer now has to survive this
   * tab losing focus/foreground to the newly-opened one, competing against
   * that new tab's own near-instant fetch of the (still old) public resume
   * data. In practice the debounced save often loses that race, so the new
   * tab shows stale data — e.g. a just-typed language name missing, only
   * the blank row it was added as. Explicitly flushing an immediate save
   * here, right on click, fires our own save request at the same moment the
   * new tab starts loading, well before its own request would go out
   * (opening a tab, then loading its JS, then it calling the API is always
   * slower than one PUT request already in flight) — so the public page one
   * click later actually reflects what was just typed.
   */
  const flushPendingAutosave = () => {
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    if (savingInFlightRef.current || saving || !isDirty || !id || pendingDraft) return;
    savingInFlightRef.current = true;
    setAutoSaveState("saving");
    persist()
      .then(() => {
        setAutoSaveState("saved");
        setTimeout(() => setAutoSaveState((s) => (s === "saved" ? "idle" : s)), 3000);
      })
      .catch(() => setAutoSaveState("error"))
      .finally(() => {
        savingInFlightRef.current = false;
      });
  };

  const scrollToAtsCheck = () => {
    setForceOpen({ open: true, token: Date.now() });
    // Let the section actually expand before scrolling to it, otherwise a
    // just-opened section's height isn't accounted for in the scroll target.
    // A single rAF fires right after the browser's next paint, but that
    // paint can still show the section collapsed if CollapsibleSection's own
    // state update hasn't been committed yet — landing the scroll short
    // (e.g. at Work Experience instead of ATS Check) on the first click, and
    // only reaching it on a second click once things had caught up. Nesting
    // a second rAF waits one more frame, by which point CollapsibleSection's
    // now-synchronous (useLayoutEffect-based) open state is guaranteed to
    // have painted, so the scroll target's height is the real, expanded one.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById("ats-check-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  return (
    <AppShell>
      <div className="app-page-head">
        <h1 id="edit-resume-title">Edit Resume</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a
            href={`/r/${resume.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            onClick={flushPendingAutosave}
          >
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
          <span>You have unsaved changes from earlier. Restore them?</span>
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
      <form id="resume-edit-form" onSubmit={onSubmit} className="builder-grid" onBlur={handleFormBlur}>
        <div className="builder-panel">
          <button className="btn btn-primary btn-block" type="submit" disabled={saving} style={{ marginBottom: 8 }}>
            {saving ? "Saving…" : "Save changes"}
          </button>

          {autoSaveState !== "idle" && (
            <p className={`autosave-indicator ${autoSaveState === "error" ? "is-error" : ""}`} role="status" aria-live="polite">
              {autoSaveState === "saving" && "Saving…"}
              {autoSaveState === "saved" && "All changes saved"}
              {autoSaveState === "error" && "Couldn't autosave, click Save changes to retry"}
            </p>
          )}

          <div className="builder-progress" style={{ marginTop: 12 }}>
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

          <CollapsibleSection title="Template" forceOpen={forceOpen} defaultOpen={false}>
            <div className="template-choices">
              {templates.map((t) => {
                const locked = !!user && !canUseTemplate(user.subscriptionTier, t.category);
                const tier = CATEGORY_MIN_TIER[t.category];
                const upgradeHint = `Upgrade to ${TIER_LABEL[tier]} to use this template.`;
                const atsSafe = isAtsSafeFamily(getTemplateStyle(t.key).family);
                // Text fallback for the tier dot/ATS tag, which are otherwise
                // color- and (for the dot) aria-hidden-only — so someone
                // relying on a screen reader, or who hasn't learned what the
                // dot colors mean, still gets tier + ATS info via the title.
                const tierNote = `${TIER_LABEL[tier]} template.${atsSafe ? " ATS friendly (single-column layout)." : ""}`;
                return (
                  <span
                    key={t.key}
                    className={`template-pill ${templateKey === t.key ? "active" : ""} ${locked ? "locked" : ""}`}
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
          </CollapsibleSection>

          {usesSkillsAndTools && (
            <CollapsibleSection title="Skills & Tools" forceOpen={forceOpen} complete={sectionProgress.skills}>
              <p className="hero-note" style={{ marginBottom: 16 }}>
                Available on every Premium template. Click a suggested keyword to add it. Skills and tools are
                grouped separately in both the picker and the resume itself.
              </p>
              <SkillsAndToolsEditor
                professionKey={professionKey}
                professionLabel={professionDetail?.label ?? resume.professionLabel}
                value={skillsAndTools}
                onChange={setSkillsAndTools}
                resumeTitle={title}
                answers={answers}
                canUseAi={canUseAiAssist}
              />
            </CollapsibleSection>
          )}

          <CollapsibleSection title="Sharing" forceOpen={forceOpen} defaultOpen={false}>
            <div className="field">
              <label>Link visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as LinkVisibility)}>
                {VISIBILITY_OPTIONS.map((v) => {
                  const locked = !!user && !canUseVisibility(user.subscriptionTier, v);
                  return (
                    <option key={v} value={v} disabled={locked}>
                      {VISIBILITY_LABEL[v]}
                      {locked ? ` (requires ${TIER_LABEL[VISIBILITY_MIN_TIER[v]]})` : ""}
                    </option>
                  );
                })}
              </select>
              <p className="hero-note" style={{ marginTop: 6, marginBottom: 0 }}>
                Starter plans get public links only. Professional adds private links, and Premium adds
                password protected links.
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
                      ? "After this time, the link stops working, even with the correct password."
                      : "Leave blank for a link that never expires."}
                  </p>
                  {resume.accessPasswordExpiresAt && new Date(resume.accessPasswordExpiresAt).getTime() < Date.now() && (
                    <p className="form-error" style={{ marginTop: 8, marginBottom: 0 }}>
                      This link's expiration has already passed. It's currently deactivated.
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

          <CollapsibleSection title="Languages" forceOpen={forceOpen} defaultOpen={false}>
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Optional: list any languages you speak and how fluently.
            </p>
            <LanguagesEditor languages={languages} onChange={setLanguages} />
          </CollapsibleSection>

          <CollapsibleSection title="Highlights & Key Achievements" forceOpen={forceOpen} complete={sectionProgress.achievements}>
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Add a quick one line bullet, or describe a challenge, what you did, and the result for a more detailed,
              structured accomplishment; both turn into resume bullets. Mainly populated by "Import an existing
              resume," but editable here too.
            </p>
            <label className="checkbox-field" style={{ marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={combineExperienceFormat}
                onChange={(e) => setCombineExperienceFormat(e.target.checked)}
              />
              Combine Work Experience with Achievements (nest each bullet under the job it belongs to)
            </label>
            <AchievementGeneratorPanel
              canGenerate={canUseAiAssist}
              professionLabel={professionDetail?.label ?? resume.professionLabel}
              jobTitle={experience[0]?.title || undefined}
              onGenerated={(generated) =>
                setAchievements((prev) => [
                  ...prev,
                  // When "Combine Work Experience with Achievements" is on, land generated
                  // bullets nested under the most recent job (same one used for jobTitle
                  // above) instead of the flat "unlinked" bucket — otherwise every generated
                  // achievement silently skips the nesting the person just turned on, and
                  // has to be re-linked by hand via AchievementEditor's job dropdown.
                  ...(combineExperienceFormat && experience[0]?.id
                    ? generated.map((a) => ({ ...a, experienceId: experience[0].id }))
                    : generated),
                ])
              }
            />
            <AchievementEditor
              achievements={achievements}
              onChange={setAchievements}
              experience={experience}
              showJobLink={combineExperienceFormat}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Generated Summary & Bullets" forceOpen={forceOpen} defaultOpen={false}>
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Your Objective/Summary/Profile text and top bullets are written by AI from your profession, answers,
              and achievements above. Don't love the wording? Click Regenerate for a new take, or edit the text
              directly below. Once saved, an edit stays exactly as you write it and won't get regenerated when you
              update Work Experience, Achievements, or the fields above, until you reset it back to autogenerated.
            </p>
            {summaryManuallyEdited && (
              <p className="hero-note" style={{ marginBottom: 16, color: "var(--color-accent, #6b5bd6)" }}>
                Manually edited, no longer updates automatically.
              </p>
            )}
            {summaryError && <div className="form-error">{summaryError}</div>}
            <div className="field">
              <label>Summary</label>
              <textarea rows={4} value={summaryDraft} onChange={(e) => setSummaryDraft(e.target.value)} />
            </div>
            <div className="field">
              <label>Bullets (one per line)</label>
              {combineExperienceFormat && (
                <p className="hero-note" style={{ marginBottom: 8 }}>
                  "Combine Work Experience with Achievements" is on above, so your resume shows bullets nested under
                  each job (from Achievements) instead of this flat list. These bullets will still save, but won't
                  appear anywhere until that checkbox is turned off.
                </p>
              )}
              <textarea rows={6} value={bulletsDraftText} onChange={(e) => setBulletsDraftText(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-primary" onClick={saveSummary} disabled={summarySaving}>
                {summarySaving ? "Saving…" : "Save summary"}
              </button>
              {/* Same action either way (regenerateSummary always sends
                  summaryManuallyEdited: false) — only the label changes,
                  since "regenerate" reads naturally when there's no manual
                  edit to discard, and "reset to auto-generated" reads
                  naturally when there is. Always visible now, not just
                  after a manual edit — previously this button only existed
                  to undo a hand-edit, so there was no way to just ask for a
                  fresh AI attempt on an untouched resume. */}
              <button type="button" className="btn btn-ghost" onClick={regenerateSummary} disabled={summarySaving}>
                {summarySaving ? "Regenerating…" : summaryManuallyEdited ? "Reset to autogenerated" : "Regenerate"}
              </button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Awards" forceOpen={forceOpen} defaultOpen={false}>
            <AwardsEditor awards={awards} onChange={setAwards} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Additional Details"
            forceOpen={forceOpen}
            defaultOpen={professionHasQuestions}
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

          {canUseReferences && (
            <CollapsibleSection title="References" forceOpen={forceOpen} defaultOpen={false}>
              <p className="hero-note" style={{ marginBottom: 16 }}>
                Adds a References section to your public resume link. Off by default: nothing appears until you
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

          {isPremium && (
            <div className="builder-divider">
              <span className="builder-divider-label">Premium Tools</span>
            </div>
          )}

          {isPremium && (
            <div id="ats-check-section">
              <CollapsibleSection title="ATS Check" forceOpen={forceOpen} defaultOpen={false}>
                <p className="hero-note" style={{ marginBottom: 16 }}>
                  An ATS (Applicant Tracking System) is the software many employers use to scan and rank resumes
                  before a person ever sees them. This check scores your resume's structure and compares it against a
                  job description's keywords, so you can see how it's likely to hold up.
                </p>
                <div className="ats-score-row">
                  <div className="ats-score-value">{healthCheck.score}%</div>
                  <p className="hero-note" style={{ margin: 0 }}>
                    Health Score: how well this resume's structure holds up to an ATS parser.
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
                        Job Match: matched {keywordMatch.matched.length} of{" "}
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
                          {usesSkillsAndTools && <span className="hero-note">, click one to add it to Skills & Tools</span>}
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
            <CollapsibleSection title="Recruiter Mode" forceOpen={forceOpen} defaultOpen={false}>
              <p className="hero-note" style={{ marginBottom: 16 }}>
                Adds a candidate summary card to the top of your public resume link: skills (pulled automatically
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

          {isPremium && selectedTemplateIsPremium && (
            <CollapsibleSection title="Cover Letter" forceOpen={forceOpen} defaultOpen={false}>
              <p className="hero-note" style={{ marginBottom: 16 }}>
                Generates a tailored AI cover letter alongside this resume. Off by default, turn this on to have one
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
                      Your AI generated cover letter will appear here after you save.
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
            <CollapsibleSection title="Version History" forceOpen={forceOpen} defaultOpen={false}>
              <p className="hero-note" style={{ marginBottom: 16 }}>
                A version is saved automatically every time you edit and save this resume. Restore any of the last
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
            languages={languages}
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
