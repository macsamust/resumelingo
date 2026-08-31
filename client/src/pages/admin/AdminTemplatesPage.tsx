import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { nextSortState, SortableHeader, SortState } from "../../components/admin/SortableHeader";
import { AdminTableSkeleton } from "../../components/admin/AdminTableSkeleton";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Modal } from "../../components/common/Modal";
import { useToast } from "../../components/common/Toast";
import { ResumePreview } from "../../components/builder/ResumePreview";
import { adminApi, ApiError } from "../../api";
import { AdminTemplate, TemplateCategory } from "../../types";

const EMPTY_NEW = { key: "", name: "", description: "", category: "basic" as TemplateCategory, sortOrder: "0" };

/**
 * Fixed placeholder content used to render a template's actual visual
 * layout in the admin preview modal — same shape a real ResumePreview
 * consumer (ResumeBuilderPage, ResumeEditPage) would pass, just filled with
 * generic sample data instead of a real user's resume, so an admin can see
 * how a template actually looks without needing a real resume on hand.
 */
const SAMPLE_RESUME = {
  fullName: "Jordan Rivera",
  contactEmail: "jordan.rivera@example.com",
  contactPhone: "(555) 123-4567",
  contactLinkedIn: "linkedin.com/in/jordanrivera",
  title: "Senior Product Manager",
  professionLabel: "Product Manager",
  summary:
    "Results driven product manager with 8+ years leading cross functional teams to ship customer facing features that grew revenue and retention across B2B and B2C products.",
  bullets: [
    "Launched a self serve onboarding flow that cut time to value from 12 days to 3 and lifted 90 day retention by 22%.",
    "Led a team of 6 engineers and 2 designers to rebuild the checkout flow, reducing cart abandonment by 18%.",
    "Partnered with sales and support to prioritize a roadmap that grew enterprise ARR by $2.1M in one year.",
  ],
  experience: [
    {
      company: "Northwind Software",
      title: "Senior Product Manager",
      city: "Austin",
      state: "TX",
      startDate: "2022-03",
      endDate: null,
      current: true,
    },
    {
      company: "Bramble Analytics",
      title: "Product Manager",
      city: "Denver",
      state: "CO",
      startDate: "2018-06",
      endDate: "2022-02",
      current: false,
    },
  ],
  education: [
    {
      school: "University of Michigan",
      degree: "B.S.",
      fieldOfStudy: "Information Science",
      startDate: "2010-08",
      endDate: "2014-05",
      current: false,
    },
  ],
  awards: [{ title: "Product Leadership Award", issuer: "Northwind Software", date: "2023-11", description: "" }],
  skillsAndTools: [
    { label: "Roadmapping", category: "skill" as const },
    { label: "SQL", category: "skill" as const },
    { label: "Figma", category: "tool" as const },
    { label: "Amplitude", category: "tool" as const },
  ],
  languages: [{ language: "English", proficiency: "Native/Bilingual" }],
};

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
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, { name: string; description: string; category: TemplateCategory; sortOrder: string }>>({});
  const [newTemplate, setNewTemplate] = useState(EMPTY_NEW);
  const [creating, setCreating] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [sort, setSort] = useState<SortState<TemplateSortKey>>({ key: "sortOrder", direction: "asc" });
  const [query, setQuery] = useState("");
  // Which template (if any) is the subject of the delete confirm dialog —
  // replaces window.confirm(), same pattern as AdminUsersPage.
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<AdminTemplate | null>(null);
  // Which template (if any) is currently shown in the visual preview modal.
  const [previewTemplate, setPreviewTemplate] = useState<AdminTemplate | null>(null);
  // Which row's "more actions" menu (Enable/Disable, Delete) is open — same
  // kebab-menu pattern as DashboardPage's resume cards, so the row only
  // shows Preview/Save as visible buttons and tucks the less-frequently-used/
  // destructive actions behind one trigger instead of four buttons
  // competing for space in every row.
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  // Closes an open row menu on any click outside it — the trigger/dropdown
  // themselves stop propagation (see below) so the same click that opens a
  // menu doesn't immediately close it again. Same pattern as DashboardPage.
  useEffect(() => {
    if (!openMenuKey) return;
    const close = () => setOpenMenuKey(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuKey]);

  // Client-side filter+sort — this catalog is small (a few dozen templates
  // at most), so unlike the Users/Resumes lists there's no real benefit to
  // pushing search server-side here.
  const sortedTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? templates.filter(
          (t) => t.name.toLowerCase().includes(q) || t.key.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
        )
      : templates;
    return [...matched].sort((a, b) => compareTemplates(a, b, sort));
  }, [templates, query, sort]);
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
      showToast("error", err instanceof ApiError ? err.message : "Couldn't save template.");
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
      showToast("error", err instanceof ApiError ? err.message : "Couldn't update template.");
    } finally {
      setBusyKey(null);
    }
  };

  const onDelete = async () => {
    if (!confirmDeleteTemplate) return;
    const t = confirmDeleteTemplate;
    setBusyKey(t.key);
    try {
      await adminApi.deleteTemplate(t.key);
      showToast("success", `"${t.name}" was deleted.`);
      setConfirmDeleteTemplate(null);
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't delete template.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>
          Templates <span className="app-page-head-count">({templates.length})</span>
        </h1>
        <input
          className="admin-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, key, or description…"
        />
      </div>
      <p className="hero-note admin-plan-warning">
        A brand new template's visual style falls back to the default look until it's added to the front end's style
        config. This manages which templates exist and are offered, not their custom visual design.
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
            <label>Key (optional, autogenerated from name)</label>
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
                    <button className="btn btn-ghost btn-sm" disabled={busyKey === t.key || savingAll} onClick={() => setPreviewTemplate(t)}>
                      Preview
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={busyKey === t.key || savingAll} onClick={() => onSave(t.key)}>
                      Save
                    </button>
                    <div className="resume-menu">
                      <button
                        className="resume-menu-trigger"
                        disabled={busyKey === t.key || savingAll}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuKey((cur) => (cur === t.key ? null : t.key));
                        }}
                        aria-label="More actions"
                        aria-expanded={openMenuKey === t.key}
                      >
                        &#8942;
                      </button>
                      {openMenuKey === t.key && (
                        <div className="resume-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setOpenMenuKey(null);
                              onToggleEnabled(t);
                            }}
                          >
                            {t.enabled ? "Disable" : "Enable"}
                          </button>
                          <button
                            className="danger"
                            onClick={() => {
                              setOpenMenuKey(null);
                              setConfirmDeleteTemplate(t);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedTemplates.length === 0 && (
              <tr>
                <td colSpan={7} className="hero-note">
                  No templates match "{query}".
                </td>
              </tr>
            )}
          </tbody>
          </table>
          <div className="admin-save-all-row">
            <button className="btn btn-primary" type="button" disabled={savingAll || templates.length === 0} onClick={onSaveAll}>
              {savingAll ? "Saving…" : "Save all"}
            </button>
          </div>
        </>
      )}
      {confirmDeleteTemplate && (
        <ConfirmDialog
          title="Delete template"
          message={`Delete the "${confirmDeleteTemplate.name}" template? Resumes already using it will keep showing its name, but it will no longer be offered to new resumes.`}
          confirmLabel="Delete"
          danger
          onConfirm={onDelete}
          onCancel={() => setConfirmDeleteTemplate(null)}
        />
      )}
      {previewTemplate && (
        <Modal title={`Preview: ${previewTemplate.name}`} onClose={() => setPreviewTemplate(null)} wide>
          <p className="hero-note" style={{ marginBottom: 16 }}>
            Rendered with sample content so you can see the actual layout, not a real resume.
          </p>
          <ResumePreview
            {...SAMPLE_RESUME}
            templateKey={previewTemplate.key}
            templateName={previewTemplate.name}
            showSkillsAndTools={previewTemplate.category === "premium"}
          />
        </Modal>
      )}
    </AdminShell>
  );
}
