import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { adminApi, ApiError } from "../../api";
import { AdminTemplate } from "../../types";

const EMPTY_NEW = { key: "", name: "", description: "", sortOrder: "0" };

export function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, { name: string; description: string; sortOrder: string }>>({});
  const [newTemplate, setNewTemplate] = useState(EMPTY_NEW);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    adminApi
      .listTemplates()
      .then((res) => {
        setTemplates(res.templates);
        const nextEditing: Record<string, { name: string; description: string; sortOrder: string }> = {};
        res.templates.forEach((t) => {
          nextEditing[t.key] = { name: t.name, description: t.description, sortOrder: String(t.sortOrder) };
        });
        setEditing(nextEditing);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load templates."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await adminApi.createTemplate({
        key: newTemplate.key.trim() || undefined,
        name: newTemplate.name.trim(),
        description: newTemplate.description.trim(),
        sortOrder: Number(newTemplate.sortOrder) || 0,
      });
      setNewTemplate(EMPTY_NEW);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create template.");
    } finally {
      setCreating(false);
    }
  };

  const onSave = async (key: string) => {
    const draft = editing[key];
    setBusyKey(key);
    try {
      await adminApi.updateTemplate(key, {
        name: draft.name,
        description: draft.description,
        sortOrder: Number(draft.sortOrder) || 0,
      });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Couldn't save template.");
    } finally {
      setBusyKey(null);
    }
  };

  const onToggleEnabled = async (t: AdminTemplate) => {
    setBusyKey(t.key);
    try {
      await adminApi.updateTemplate(t.key, { enabled: !t.enabled });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Couldn't update template.");
    } finally {
      setBusyKey(null);
    }
  };

  const onDelete = async (t: AdminTemplate) => {
    if (!confirm(`Delete the "${t.name}" template? Resumes already using it will keep showing its name, but it will no longer be offered to new resumes.`)) return;
    setBusyKey(t.key);
    try {
      await adminApi.deleteTemplate(t.key);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Couldn't delete template.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>Templates</h1>
      </div>
      <p className="hero-note admin-plan-warning">
        A brand-new template's visual style falls back to the default look until it's added to the front end's style
        config — this manages which templates exist and are offered, not their custom visual design.
      </p>
      {error && <div className="form-error">{error}</div>}

      <form className="admin-new-template" onSubmit={onCreate}>
        <h2>Add a template</h2>
        <div className="admin-new-template-row">
          <div className="field">
            <label>Name</label>
            <input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="e.g. Portfolio" required />
          </div>
          <div className="field">
            <label>Key (optional — auto-generated from name)</label>
            <input value={newTemplate.key} onChange={(e) => setNewTemplate({ ...newTemplate, key: e.target.value })} placeholder="e.g. portfolio" />
          </div>
          <div className="field">
            <label>Sort order</label>
            <input type="number" value={newTemplate.sortOrder} onChange={(e) => setNewTemplate({ ...newTemplate, sortOrder: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <input value={newTemplate.description} onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })} placeholder="Short description shown in the template picker" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? "Adding…" : "Add template"}
        </button>
      </form>

      {loading ? (
        <div className="spinner-page">Loading templates…</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Name</th>
              <th>Description</th>
              <th>Sort</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const draft = editing[t.key] ?? { name: t.name, description: t.description, sortOrder: String(t.sortOrder) };
              return (
                <tr key={t.key}>
                  <td className="hero-note">{t.key}</td>
                  <td>
                    <input
                      value={draft.name}
                      onChange={(e) => setEditing({ ...editing, [t.key]: { ...draft, name: e.target.value } })}
                    />
                  </td>
                  <td>
                    <input
                      value={draft.description}
                      onChange={(e) => setEditing({ ...editing, [t.key]: { ...draft, description: e.target.value } })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="admin-sort-input"
                      value={draft.sortOrder}
                      onChange={(e) => setEditing({ ...editing, [t.key]: { ...draft, sortOrder: e.target.value } })}
                    />
                  </td>
                  <td>
                    <span className={`admin-status-tag ${t.enabled ? "active" : "suspended"}`}>
                      {t.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="admin-row-actions">
                    <button className="btn btn-ghost btn-sm" disabled={busyKey === t.key} onClick={() => onSave(t.key)}>
                      Save
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={busyKey === t.key} onClick={() => onToggleEnabled(t)}>
                      {t.enabled ? "Disable" : "Enable"}
                    </button>
                    <button className="btn btn-ghost btn-sm admin-danger" disabled={busyKey === t.key} onClick={() => onDelete(t)}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </AdminShell>
  );
}
