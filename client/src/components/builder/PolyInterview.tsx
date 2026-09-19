import { FormEvent, useState } from "react";
import { PolyAvatar } from "../brand/PolyAvatar";
import { PolyLoader } from "../brand/PolyLoader";
import { MonthYearField } from "./MonthYearField";
import { AchievementEntry, EducationEntry, WorkExperienceEntry } from "../../types";
import { generateId } from "../../utils/id";
import { ApiError, achievementGenerateApi } from "../../api";

interface Props {
  fullName: string;
  onFullNameChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  experience: WorkExperienceEntry[];
  onExperienceChange: (experience: WorkExperienceEntry[]) => void;
  education: EducationEntry[];
  onEducationChange: (education: EducationEntry[]) => void;
  achievements: AchievementEntry[];
  onAchievementsChange: (achievements: AchievementEntry[]) => void;
  /** Same gate AchievementGeneratorPanel uses (Professional/Premium — see AchievementGenerateController) — when false, the interview skips straight from Education to done and Achievements stays a classic-form-only, hand-written section, same as today. */
  canGenerateAchievements: boolean;
  /** Passed straight through to achievementGenerateApi.generate, same as AchievementGeneratorPanel — usually empty here, since Profession (classic form's section 1) isn't part of this interview and so isn't chosen yet by the time Achievements comes up. The generator call tolerates an empty label fine; it just can't lean on it to calibrate seniority. */
  professionLabel: string;
  /** Bails out to the classic stacked-accordion form at any point — available on every step, not just up front, since someone might start the interview and decide partway through it's not for them. */
  onSwitchToClassic: () => void;
  /** Called once Work Experience, Education, and (if applicable) Achievements are all settled — hands off to the classic form (already pre-filled) for Template, Awards, and everything else. This component never itself creates the resume. */
  onComplete: () => void;
}

type Step =
  | "info"
  | "experience-form"
  | "experience-loop"
  | "education-form"
  | "education-loop"
  | "achievement-ask"
  | "achievement-followup"
  | "done";

/** Which of the 4 progress dots is lit — matches the same 4 key sections the classic form's "X of 4 key sections complete" counts (Info, Work Experience, Education, Achievements; Template has no interview step and isn't one of the 4). */
const STEP_DOT: Record<Step, number> = {
  info: 0,
  "experience-form": 1,
  "experience-loop": 1,
  "education-form": 2,
  "education-loop": 2,
  "achievement-ask": 3,
  "achievement-followup": 3,
  done: 3,
};

function blankExperienceDraft(): WorkExperienceEntry {
  return { id: generateId(), company: "", title: "", startDate: "", endDate: "", current: false };
}

function blankEducationDraft(): EducationEntry {
  return { school: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "", current: false };
}

/**
 * "Let Poly interview me" — the alternative to New Resume's classic stacked
 * accordion, covering the same 3 sections (Info, Work Experience, Education)
 * one focused question at a time instead of all at once. Achievements isn't
 * part of this yet (see this component's own follow-up, Phase 2 — the AI-assist
 * cost/latency question there needs its own decision first) and Template/
 * Awards/"Answer a few questions" never will be: onComplete hands off
 * straight to the classic form, already pre-filled, for those.
 *
 * Deliberately skips city/state (Work Experience) here even though
 * ExperienceEditor collects them — sectionProgress.workExperience only
 * checks company+title, and an interview asking for four fields before its
 * first "add another job?" prompt fights the whole point of feeling like a
 * quick back-and-forth rather than a form in a chat costume. Those fields
 * are still there waiting in the classic form afterward for anyone who wants
 * to add them.
 *
 * Reuses MonthYearField (the same date-picker ExperienceEditor/
 * EducationEditor use) rather than a plain text input, but not
 * ExperienceEditor/EducationEditor themselves — those render their own
 * "+ Add" button and per-row move/duplicate/remove chrome, which would let
 * someone add a second entry without ever seeing the "add another job?"
 * loop prompt this component is built around.
 */
export function PolyInterview({
  fullName,
  onFullNameChange,
  title,
  onTitleChange,
  experience,
  onExperienceChange,
  education,
  onEducationChange,
  achievements,
  onAchievementsChange,
  canGenerateAchievements,
  professionLabel,
  onSwitchToClassic,
  onComplete,
}: Props) {
  const [step, setStep] = useState<Step>("info");
  const [infoError, setInfoError] = useState<string | null>(null);
  const [draftExperience, setDraftExperience] = useState<WorkExperienceEntry>(blankExperienceDraft());
  const [draftEducation, setDraftEducation] = useState<EducationEntry>(blankEducationDraft());
  // True once someone's tried to move on with zero jobs/schools entered and
  // gotten the one-time nudge — lets a second "that's all" actually proceed
  // instead of nagging forever. Reset whenever a fresh loop starts.
  const [experienceZeroNudge, setExperienceZeroNudge] = useState(false);
  const [educationZeroNudge, setEducationZeroNudge] = useState(false);
  // Which job in `experience` Achievements is currently asking about — one
  // question per job entered (the agreed Phase 2 cap), in the same order
  // they were added. Not used at all if canGenerateAchievements is false or
  // no jobs were entered; see startAchievements below.
  const [achievementJobIndex, setAchievementJobIndex] = useState(0);
  const [achKeywords, setAchKeywords] = useState("");
  const [achStatus, setAchStatus] = useState<"idle" | "generating" | "error">("idle");
  const [achError, setAchError] = useState<string | null>(null);

  const submitInfo = (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setInfoError("Enter your name to continue.");
      return;
    }
    setInfoError(null);
    setStep("experience-form");
  };

  const commitExperience = (e: FormEvent) => {
    e.preventDefault();
    // A blank "Continue" (nothing typed) is treated the same as skipping
    // this entry, not an error — someone realizing mid-form they don't want
    // to add this job shouldn't be stuck unable to move past it.
    if (draftExperience.company.trim() || draftExperience.title.trim()) {
      onExperienceChange([...experience, draftExperience]);
    }
    setStep("experience-loop");
  };

  const addAnotherJob = () => {
    setDraftExperience(blankExperienceDraft());
    setExperienceZeroNudge(false);
    setStep("experience-form");
  };

  const finishExperience = () => {
    if (experience.length === 0 && !experienceZeroNudge) {
      setExperienceZeroNudge(true);
      return;
    }
    setStep("education-form");
  };

  const commitEducation = (e: FormEvent) => {
    e.preventDefault();
    if (draftEducation.school.trim() || draftEducation.degree.trim() || draftEducation.fieldOfStudy.trim()) {
      onEducationChange([...education, draftEducation]);
    }
    setStep("education-loop");
  };

  const addAnotherSchool = () => {
    setDraftEducation(blankEducationDraft());
    setEducationZeroNudge(false);
    setStep("education-form");
  };

  const finishEducation = () => {
    if (education.length === 0 && !educationZeroNudge) {
      setEducationZeroNudge(true);
      return;
    }
    startAchievementsOrDone();
  };

  // Achievements only runs at all if the account can use AI-assist and at
  // least one job was entered — otherwise there's nothing to ask about
  // (Achievements stays available by hand in the classic form either way).
  const startAchievementsOrDone = () => {
    if (canGenerateAchievements && experience.length > 0) {
      setAchievementJobIndex(0);
      setAchKeywords("");
      setAchStatus("idle");
      setAchError(null);
      setStep("achievement-ask");
    } else {
      setStep("done");
    }
  };

  const advanceToNextJobOrDone = () => {
    const next = achievementJobIndex + 1;
    setAchKeywords("");
    setAchStatus("idle");
    setAchError(null);
    if (next < experience.length) {
      setAchievementJobIndex(next);
      setStep("achievement-ask");
    } else {
      setStep("done");
    }
  };

  const skipAchievementsForJob = () => advanceToNextJobOrDone();

  const generateAchievements = async (followUp: boolean) => {
    if (!achKeywords.trim()) return;
    const job = experience[achievementJobIndex];
    setAchStatus("generating");
    setAchError(null);
    try {
      const { achievements: generated } = await achievementGenerateApi.generate({
        professionLabel,
        jobTitle: job?.title,
        keywords: achKeywords,
      });
      if (generated.length === 0) {
        setAchError("Couldn't generate anything from that. Try adding a bit more detail, or skip this one.");
        setAchStatus("error");
        return;
      }
      onAchievementsChange([...achievements, ...generated.map((a) => ({ ...a, experienceId: job?.id ?? null }))]);
      setAchKeywords("");
      setAchStatus("idle");
      if (followUp) {
        advanceToNextJobOrDone();
      } else {
        setStep("achievement-followup");
      }
    } catch (err) {
      setAchError(err instanceof ApiError ? err.message : "Something went wrong generating those. You can still write your own in the next step.");
      setAchStatus("error");
    }
  };

  return (
    <div className="poly-interview">
      <div className="poly-interview-progress">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`poly-interview-dot ${i <= STEP_DOT[step] ? "is-lit" : ""}`} />
        ))}
      </div>

      {step === "info" && (
        <div className="poly-interview-card">
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly asks</span>
          </div>
          <p className="poly-interview-question">What's your name, and what role are we building this resume for?</p>
          <form onSubmit={submitInfo}>
            <div className="field">
              <label>Your name</label>
              <input value={fullName} onChange={(e) => onFullNameChange(e.target.value)} placeholder="e.g. Jordan Lee" autoFocus />
            </div>
            <div className="field">
              <label>Resume title</label>
              <input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="e.g. Software Engineer Resume" />
            </div>
            {infoError && <p className="form-error">{infoError}</p>}
            <div className="poly-interview-actions">
              <button type="button" className="poly-interview-switch" onClick={onSwitchToClassic}>
                Switch to classic form
              </button>
              <button type="submit" className="btn btn-primary">
                Next
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "experience-form" && (
        <div className="poly-interview-card">
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly asks</span>
          </div>
          <p className="poly-interview-question">
            {experience.length === 0 ? "Tell me about your most recent job." : "What about the one before that?"}
          </p>
          <form onSubmit={commitExperience}>
            <div className="field">
              <label>Company</label>
              <input
                value={draftExperience.company}
                onChange={(e) => setDraftExperience((d) => ({ ...d, company: e.target.value }))}
                placeholder="e.g. Acme Corp"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Title held</label>
              <input
                value={draftExperience.title}
                onChange={(e) => setDraftExperience((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Senior Software Engineer"
              />
            </div>
            <div className="experience-dates">
              <MonthYearField
                label="Start date"
                value={draftExperience.startDate}
                onChange={(v) => setDraftExperience((d) => ({ ...d, startDate: v }))}
              />
              <MonthYearField
                label="End date"
                value={draftExperience.endDate ?? ""}
                disabled={draftExperience.current}
                onChange={(v) => setDraftExperience((d) => ({ ...d, endDate: v }))}
              />
            </div>
            <label className="experience-current">
              <input
                type="checkbox"
                checked={draftExperience.current}
                onChange={(e) => setDraftExperience((d) => ({ ...d, current: e.target.checked, endDate: e.target.checked ? null : d.endDate }))}
              />
              I currently work here
            </label>
            <div className="poly-interview-actions">
              <button type="button" className="poly-interview-switch" onClick={onSwitchToClassic}>
                Switch to classic form
              </button>
              <button type="submit" className="btn btn-primary">
                Next
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "experience-loop" && (
        <div className="poly-interview-card">
          {experience.length > 0 && (
            <ul className="poly-interview-list">
              {experience.map((job) => (
                <li key={job.id}>
                  {job.title || "Untitled role"}
                  {job.company ? `, ${job.company}` : ""}
                </li>
              ))}
            </ul>
          )}
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly asks</span>
          </div>
          <p className="poly-interview-question">
            {experienceZeroNudge
              ? "Nothing added yet — want to add at least one role, or skip work experience entirely?"
              : "Any other roles you'd like on here?"}
          </p>
          <div className="poly-interview-actions">
            <button type="button" className="poly-interview-switch" onClick={onSwitchToClassic}>
              Switch to classic form
            </button>
            <button type="button" className="btn btn-ghost" onClick={finishExperience}>
              {experienceZeroNudge ? "Skip work experience" : "That's all my jobs"}
            </button>
            <button type="button" className="btn btn-primary" onClick={addAnotherJob}>
              {experienceZeroNudge ? "Add a role" : "Add another role"}
            </button>
          </div>
        </div>
      )}

      {step === "education-form" && (
        <div className="poly-interview-card">
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly asks</span>
          </div>
          <p className="poly-interview-question">{education.length === 0 ? "Where'd you go to school?" : "Any other schools?"}</p>
          <form onSubmit={commitEducation}>
            <div className="field">
              <label>School</label>
              <input
                value={draftEducation.school}
                onChange={(e) => setDraftEducation((d) => ({ ...d, school: e.target.value }))}
                placeholder="e.g. University of Michigan"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Degree</label>
              <input
                value={draftEducation.degree}
                onChange={(e) => setDraftEducation((d) => ({ ...d, degree: e.target.value }))}
                placeholder="e.g. B.S."
              />
            </div>
            <div className="field">
              <label>Field of study</label>
              <input
                value={draftEducation.fieldOfStudy}
                onChange={(e) => setDraftEducation((d) => ({ ...d, fieldOfStudy: e.target.value }))}
                placeholder="e.g. Computer Science"
              />
            </div>
            <div className="experience-dates">
              <MonthYearField
                label="Start date"
                value={draftEducation.startDate}
                onChange={(v) => setDraftEducation((d) => ({ ...d, startDate: v }))}
              />
              <MonthYearField
                label="End date"
                value={draftEducation.endDate ?? ""}
                disabled={draftEducation.current}
                onChange={(v) => setDraftEducation((d) => ({ ...d, endDate: v }))}
              />
            </div>
            <label className="experience-current">
              <input
                type="checkbox"
                checked={draftEducation.current}
                onChange={(e) => setDraftEducation((d) => ({ ...d, current: e.target.checked, endDate: e.target.checked ? null : d.endDate }))}
              />
              I'm currently enrolled here
            </label>
            <div className="poly-interview-actions">
              <button type="button" className="poly-interview-switch" onClick={onSwitchToClassic}>
                Switch to classic form
              </button>
              <button type="submit" className="btn btn-primary">
                Next
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "education-loop" && (
        <div className="poly-interview-card">
          {education.length > 0 && (
            <ul className="poly-interview-list">
              {education.map((school, i) => (
                <li key={i}>
                  {school.school || "Untitled school"}
                  {school.degree ? `, ${school.degree}` : ""}
                </li>
              ))}
            </ul>
          )}
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly asks</span>
          </div>
          <p className="poly-interview-question">
            {educationZeroNudge
              ? "Nothing added yet — want to add at least one school, or skip education entirely?"
              : "Any other schools you'd like on here?"}
          </p>
          <div className="poly-interview-actions">
            <button type="button" className="poly-interview-switch" onClick={onSwitchToClassic}>
              Switch to classic form
            </button>
            <button type="button" className="btn btn-ghost" onClick={finishEducation}>
              {educationZeroNudge ? "Skip education" : "That's all my schools"}
            </button>
            <button type="button" className="btn btn-primary" onClick={addAnotherSchool}>
              {educationZeroNudge ? "Add a school" : "Add another school"}
            </button>
          </div>
        </div>
      )}

      {step === "achievement-ask" && (
        <div className="poly-interview-card">
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly asks</span>
          </div>
          <p className="poly-interview-question">
            What's one thing you're proud of from your time
            {experience[achievementJobIndex]?.title ? ` as ${experience[achievementJobIndex].title}` : ""}
            {experience[achievementJobIndex]?.company ? ` at ${experience[achievementJobIndex].company}` : ""}?
          </p>
          <p className="hero-note" style={{ marginBottom: 10 }}>
            A few fragments are fine — e.g. "led migration to Kubernetes" or "cut deploy time in half". AI turns it into
            a draft bullet you can edit later; it won't invent numbers you didn't give it.
          </p>
          <textarea
            rows={3}
            value={achKeywords}
            onChange={(e) => setAchKeywords(e.target.value)}
            placeholder="e.g. led migration to Kubernetes, mentored 3 junior engineers"
            disabled={achStatus === "generating"}
            autoFocus
          />
          {achStatus === "error" && achError && <p className="form-error" style={{ marginTop: 10 }}>{achError}</p>}
          {achStatus === "generating" ? (
            <div style={{ marginTop: 14 }}>
              <PolyLoader label="Generating…" />
            </div>
          ) : (
            <div className="poly-interview-actions">
              <button type="button" className="poly-interview-switch" onClick={onSwitchToClassic}>
                Switch to classic form
              </button>
              <button type="button" className="btn btn-ghost" onClick={skipAchievementsForJob}>
                Skip this one
              </button>
              <button type="button" className="btn btn-primary" disabled={!achKeywords.trim()} onClick={() => generateAchievements(false)}>
                Generate
              </button>
            </div>
          )}
        </div>
      )}

      {step === "achievement-followup" && (
        <div className="poly-interview-card">
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly asks</span>
          </div>
          <p className="poly-interview-question">Anything else worth mentioning from that same job?</p>
          <textarea
            rows={3}
            value={achKeywords}
            onChange={(e) => setAchKeywords(e.target.value)}
            placeholder="e.g. reduced onboarding time for new hires"
            disabled={achStatus === "generating"}
            autoFocus
          />
          {achStatus === "error" && achError && <p className="form-error" style={{ marginTop: 10 }}>{achError}</p>}
          {achStatus === "generating" ? (
            <div style={{ marginTop: 14 }}>
              <PolyLoader label="Generating…" />
            </div>
          ) : (
            <div className="poly-interview-actions">
              <button type="button" className="poly-interview-switch" onClick={onSwitchToClassic}>
                Switch to classic form
              </button>
              <button type="button" className="btn btn-ghost" onClick={advanceToNextJobOrDone}>
                No, that's it
              </button>
              <button type="button" className="btn btn-primary" disabled={!achKeywords.trim()} onClick={() => generateAchievements(true)}>
                Generate
              </button>
            </div>
          )}
        </div>
      )}

      {step === "done" && (
        <div className="poly-interview-card">
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly says</span>
          </div>
          <p className="poly-interview-question">
            Nice, that's your resume's backbone. Pick a template next, and add anything else you want from there.
          </p>
          <div className="poly-interview-actions">
            <span aria-hidden="true" />
            <button type="button" className="btn btn-primary" onClick={onComplete}>
              Continue to template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
