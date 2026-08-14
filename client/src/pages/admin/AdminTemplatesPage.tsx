import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { nextSortState, SortableHeader, SortState } from "../../components/admin/SortableHeader";
import { AdminTableSkeleton } from "../../components/admin/AdminTableSkeleton";
import { adminApi, ApiError } from "../../api";
import { AdminTemplate, TemplateCategory } from "../../types";

const EMPTY_NEW = { key: "", name: "", description: "", category: "basic" as TemplateCategory, sortOrder: "0" };

/** Labels shown in the category dropdown/table — mirrors the 1:1 mapping to subscription tiers (basic=Starter, upgrade=Professional, premium=Premium). */
const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  basic: "Basic (Starter)",
  upgrade: "Upgrade (Professional)",
  premium: "Premium",
};

/** Rank for sorting by category, so it reflects the plan hierarchy rather than alphabetical order. */
const CATEGORY_RANK: Record<TemplateCategory, number> = { basic: 0, upgrade: 1, premium: 2 };

type TemplateSortKey = "key" | "name" | "description" | "category" | "sortOrder" | "enabled";

function compareTemplates(a: AdminTemplate, b: AdminTemplate, sort: SortState<TemplateSortKey>): number {
  let result: number;
  switch (sort.key) {
    case "key":
      result = a.key.localeCompare(b.key);
      break;
    case "name":
      result = a.name.localeCompare(b.name);
      break;
    case "description":
      result = a.description.localeCompare(b.description);
      break;
    case "category":
      result = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
      break;
    case "sortOrder":
      result = a.sortOrder - b.sortOrder;
      break;
    case "enabled":
      result = Number(a.enabled) - Number(b.enabled);
      break;
  }
  return sort.direction === "asc" ? result : -result;
}

export function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, { name: string; description: string; category: TemplateCategory; sortOrder: string }>>({});
  const [newTemplate, setNewTemplate] = useState(EMPTY_NEW);
  const [creating, setCreating] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [sort, setSort] = useState<SortState<TemplateSortKey>>({ key: "sortOrder", direction: "asc" });

  const sortedTemplates = useMemo(() => [...templates].sort((a, b) => compareTemplates(a, b, sort)), [templates, sort]);
  const onSort = (key: TemplateSortKey) => setSort((prev) => nextSortState(prev, key));

  const load = () => {
    setLoading(true);
    setError(null);
    adminApi
      .listTemplates()
      .then((res) => {
        setTemplates(res.templates);
        const nextEditing: Record<string, { name: string; description: string; category: TemplateCategory; sortOrder: string }> = {};
        res.templates.forEach((t) => {
          nextEditing[t.key] = { name: t.name, description: t.description, category: t.category, sortOrder: String(t.sortOrder) };
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
        category: newTemplate.category,
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
        category: draft.category,
        sortOrder: Number(draft.sortOrder) || 0,
      });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Couldn't save template.");
    } finally {
      setBusyKey(null);
    }
  };

  /** Saves every row's current draft (name/description/category/sortOrder) in one go, rather than one row at a time via the per-row Save button. */
  const onSaveAll = async () => {
    setSavingAll(true);
    setError(null);
    try {
      await Promise.all(
        templates.map((t) => {
          const draft = editing[t.key];
          if (!draft) return Promise.resolve();
          return adminApi.updateTemplate(t.key, {
            name: draft.name,
            description: draft.description,
            category: draft.category,
            sortOrder: Number(draft.sortOrder) || 0,
          });
        })
      );
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save all templates.");
    } finally {
      setSavingAll(false);
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
          <label>Category (which plan can use it)</label>
          <select value={newTemplate.category} onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as TemplateCategory })}>
            {(Object.keys(CATEGORY_LABELS) as TemplateCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
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
        <AdminTableSkeleton columns={7} />
      ) : (
        <>
          <div className="admin-save-all-row">
            <button className="btn btn-primary" type="button" disabled={savingAll || templates.length === 0} onClick={onSaveAll}>
              {savingAll ? "Saving…" : "Save all"}
            </button>
          </div>
          <table className="admin-table">
          <thead>
            <tr>
              <SortableHeader label="Key" sortKey="key" sort={sort} onSort={onSort} />
              <SortableHeader label="Name" sortKey="name" sort={sort} onSort={onSort} />
              <SortableHeader label="Description" sortKey="description" sort={sort} onSort={onSort} />
              <SortableHeader label="Category" sortKey="category" sort={sort} onSort={onSort} />
              <SortableHeader label="Sort" sortKey="sortOrder" sort={sort} onSort={onSort} />
              <SortableHeader label="Status" sortKey="enabled" sort={sort} onSort={onSort} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedTemplates.map((t) => {
              const draft = editing[t.key] ?? { name: t.name, description: t.description, category: t.category, sortOrder: String(t.sortOrder) };
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
                    <select
                      value={draft.category}
                      onChange={(e) => setEditing({ ...editing, [t.key]: { ...draft, category: e.target.value as TemplateCategory } })}
                    >
                      {(Object.keys(CATEGORY_LABELS) as TemplateCategory[]).map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
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
                    <button className="btn btn-ghost btn-sm" disabled={busyKey === t.key || savingAll} onClick={() => onSave(t.key)}>
                      Save
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={busyKey === t.key || savingAll} onClick={() => onToggleEnabled(t)}>
                      {t.enabled ? "Disable" : "Enable"}
                    </button>
                    <button className="btn btn-ghost btn-sm admin-danger" disabled={busyKey === t.key || savingAll} onClick={() => onDelete(t)}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
          <div className="admin-save-all-row">
            <button className="btn btn-primary" type="button" disabled={savingAll || templates.length === 0} onClick={onSaveAll}>
              {savingAll ? "Saving…" : "Save all"}
            </button>
          </div>
        </>
      )}
    </AdminShell>
  );
}
