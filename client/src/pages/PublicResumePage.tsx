import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError, catalogApi } from "../api";
import { PublicResume } from "../types";
import { ResumePreview } from "../components/builder/ResumePreview";

export function PublicResumePage() {
  const { slug } = useParams<{ slug: string }>();
  const [resume, setResume] = useState<PublicResume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  const load = (pwd?: string) => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    catalogApi
      .getPublicResume(slug, pwd)
      .then((res) => {
        setResume(res.resume);
        setPasswordRequired(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setPasswordRequired(true);
        } else if (err instanceof ApiError && err.status === 404) {
          setError("This resume link doesn't exist or was removed.");
        } else {
          setError("Something went wrong loading this resume.");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmitPassword = (e: FormEvent) => {
    e.preventDefault();
    load(password);
  };

  if (loading) return <div className="spinner-page">Loading resume…</div>;

  if (passwordRequired) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Password required</h1>
          <p className="sub">This Websume is password-protected.</p>
          <form onSubmit={onSubmitPassword}>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </div>
            <button className="btn btn-primary btn-block" type="submit">
              View resume
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error || !resume) {
    return <div className="empty-state">{error || "Resume not found."}</div>;
  }

  return (
    <div className="public-resume-page">
      <ResumePreview
        fullName={resume.fullName}
        title={resume.title}
        professionLabel={resume.professionLabel}
        templateKey={resume.templateKey}
        templateName={resume.template?.name}
        summary={resume.generatedSummary}
        bullets={resume.generatedBullets}
        experience={resume.experience}
        education={resume.education}
        awards={resume.awards}
      />
      <div className="public-resume-card public-resume-details">
        <div className="answer-grid">
          {Object.entries(resume.answers)
            .filter(([, v]) => v && v.trim())
            .map(([key, value]) => (
              <div key={key}>
                <div className="answer-key">{key.replace(/([A-Z])/g, " $1")}</div>
                <div className="answer-value">{value}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
