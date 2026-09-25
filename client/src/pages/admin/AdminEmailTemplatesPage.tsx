import { useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { adminApi, ApiError } from "../../api";
import { AdminEmailTemplate } from "../../types";

/**
 * Read-only preview of every email ResumeLingo sends (worker's
 * EmailService.TEMPLATES), plus a free-text comment per template — CJ, Sep
 * 2026: wanted a way to see what each email looks like and leave a note
 * ("this one needs a copy update") without digging through EmailService.ts.
 *
 * Deliberately preview-only: the rendered HTML comes straight from
 * EmailService.renderPreview (the exact same code path a real send uses,
 * with sample data), not a separate editable copy. There's no way to change
 * what a template actually says from this page — see the note editor's own
 * copy below for why, and AdminEmailTemplateController's doc comment for the
 * fuller reasoning.
 */
export function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<AdminEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listEmailTemplates()
      .then((res) => {
        setTemplates(res.templates);
        setNoteDrafts(Object.fromEntries(res.templates.map((t) => [t.key, t.note])));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load the email templates."))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpanded = (key: string) => {
    const next = expandedKey === key ? null : key;
    setExpandedKey(next);
    if (next && !previewHtml[next]) {
      setPreviewLoading(next);
      adminApi
        .previewEmailTemplate(next)
        .then((res) => setPreviewHtml((prev) => ({ ...prev, [next]: res.html })))
        .catch(() => setPreviewHtml((prev) => ({ ...prev, [next]: "<p>Couldn't load this preview.</p>" })))
        .finally(() => setPreviewLoading(null));
    }
  };

  const saveNote = async (key: string) => {
    setSavingKey(key);
    setSavedKey(null);
    try {
      await adminApi.saveEmailTemplateNote(key, noteDrafts[key] ?? "");
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that note.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>Email Templates</h1>
      </div>
      <p className="hero-note admin-plan-warning">
        Every email ResumeLingo sends, with what triggers it. Preview renders the exact same template a real send
        uses, filled with sample data — nothing here is editable from this page. Leave a comment on a template to
        flag something for later (e.g. a copy tweak) without needing to touch the code.
      </p>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <p className="hero-note">Loading…</p>
      ) : (
        <div className="admin-email-template-list">
          {templates.map((t) => (
            <div className="admin-email-template-card" key={t.key}>
              <div className="admin-email-template-head">
                <div>
                  <p className="admin-email-template-label">{t.label}</p>
                  <p className="hero-note admin-email-template-trigger">{t.trigger}</p>
                </div>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => toggleExpanded(t.key)}>
                  {expandedKey === t.key ? "Hide preview" : "Preview"}
                </button>
              </div>

              {expandedKey === t.key && (
                <div className="admin-email-template-preview">
                  {previewLoading === t.key ? (
                    <p className="hero-note">Rendering…</p>
                  ) : (
                    <iframe
                      title={`Preview of ${t.label}`}
                      sandbox=""
                      srcDoc={previewHtml[t.key] ?? ""}
                      className="admin-email-template-iframe"
                    />
                  )}
                </div>
              )}

              <div className="admin-email-template-note">
                <label className="admin-email-template-note-label" htmlFor={`note-${t.key}`}>
                  Comment
                </label>
                <textarea
                  id={`note-${t.key}`}
                  value={noteDrafts[t.key] ?? ""}
                  onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [t.key]: e.target.value }))}
                  placeholder="e.g. This copy needs updating once the new pricing ships."
                  rows={2}
                />
                <div className="admin-email-template-note-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    disabled={savingKey === t.key}
                    onClick={() => saveNote(t.key)}
                  >
                    {savingKey === t.key ? "Saving…" : savedKey === t.key ? "Saved." : "Save comment"}
                  </button>
                  {t.noteUpdatedAt && (
                    <span className="hero-note admin-email-template-note-meta">
                      Last updated {new Date(t.noteUpdatedAt).toLocaleString()}
                      {t.noteUpdatedByAdminEmail ? ` by ${t.noteUpdatedByAdminEmail}` : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
