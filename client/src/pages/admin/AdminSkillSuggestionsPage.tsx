import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { nextSortState, SortableHeader, SortState } from "../../components/admin/SortableHeader";
import { AdminTableSkeleton } from "../../components/admin/AdminTableSkeleton";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { useToast } from "../../components/common/Toast";
import { adminApi, catalogApi, ApiError } from "../../api";
import { AdminSkillSuggestion, ProfessionSummary } from "../../types";

const EMPTY_NEW = { professionKey: "", label: "", category: "skill" as "skill" | "tool", sortOrder: "0" };

type SuggestionSortKey = "professionKey" | "label" | "category" | "sortOrder";

function compareSuggestions(a: AdminSkillSuggestion, b: AdminSkillSuggestion, sort: SortState<SuggestionSortKey>): number {
  let result: number;
  switch (sort.key) {
    case "professionKey":
      result = a.professionKey.localeCompare(b.professionKey);
      break;
    case "label":
      result = a.label.localeCompare(b.label);
      break;
    case "category":
      result = a.category.localeCompare(b.category);
      break;
    case "sortOrder":
      result = a.sortOrder - b.sortOrder;
      break;
  }
  return sort.direction === "asc" ? result : -result;
}

/**
 * Admin console for the "Skills & Tools" picker's suggestion keywords (Edit
 * Resume, Portrait template — see client's SkillsAndToolsEditor.tsx). Reads
 * as "AI-generated" to the person using the picker, but is actually this
 * curated, per-profession list — same admin-editable-catalog pattern as
 * AdminTemplatesPage.tsx, just keyed by profession instead of template key.
 */
export function AdminSkillSuggestionsPage() {
  const { showToast } = useToast();
  const [professions, setProfessions] = useState<ProfessionSummary[]>([]);
  const [suggestions, setSuggestions] = useState<AdminSkillSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, { professionKey: string; label: string; category: "skill" | "tool"; sortOrder: string }>>({});
  const [newSuggestion, setNewSuggestion] = useState(EMPTY_NEW);
  const [creating, setCreating] = useState(false);
  const [filterProfession, setFilterProfession] = useState<string>("all");
  const [sort, setSort] = useState<SortState<SuggestionSortKey>>({ key: "professionKey", direction: "asc" });
  // Which suggestion (if any) is the subject of the delete confirm dialog —
  // replaces window.confirm(), same pattern as AdminUsersPage.
  const [confirmDelete, setConfirmDelete] = useState<AdminSkillSuggestion | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([adminApi.listSkillSuggestions(), catalogApi.listProfessions()])
      .then(([suggestionsRes, professionsRes]) => {
        setSuggestions(suggestionsRes.skillSuggestions);
        setProfessions(professionsRes.professions);
        const nextEditing: Record<string, { professionKey: string; label: string; category: "skill" | "tool"; sortOrder: string }> = {};
        suggestionsRes.skillSuggestions.forEach((s) => {
          nextEditing[s.id] = { professionKey: s.professionKey, label: s.label, category: s.category, sortOrder: String(s.sortOrder) };
        });
        setEditing(nextEditing);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load skill suggestions."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(
    () => (filterProfession === "all" ? suggestions : suggestions.filter((s) => s.professionKey === filterProfession)),
    [suggestions, filterProfession]
  );
  const sorted = useMemo(() => [...filtered].sort((a, b) => compareSuggestions(a, b, sort)), [filtered, sort]);
  const onSort = (key: SuggestionSortKey) => setSort((prev) => nextSortState(prev, key));

  const professionLabel = (key: string) => professions.find((p) => p.key === key)?.label ?? key;

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSuggestion.professionKey || !newSuggestion.label.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await adminApi.createSkillSuggestion({
        professionKey: newSuggestion.professionKey,
        label: newSuggestion.label.trim(),
        category: newSuggestion.category,
        sortOrder: Number(newSuggestion.sortOrder) || 0,
      });
      setNewSuggestion(EMPTY_NEW);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add keyword.");
    } finally {
      setCreating(false);
    }
  };

  const onSave = async (id: string) => {
    const draft = editing[id];
    setBusyId(id);
    try {
      await adminApi.updateSkillSuggestion(id, {
        professionKey: draft.professionKey,
        label: draft.label,
        category: draft.category,
        sortOrder: Number(draft.sortOrder) || 0,
      });
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't save keyword.");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    const s = confirmDelete;
    setBusyId(s.id);
    try {
      await adminApi.deleteSkillSuggestion(s.id);
      showToast("success", `"${s.label}" was removed.`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't delete keyword.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>Skills &amp; Tools Suggestions</h1>
      </div>
      <p className="hero-note admin-plan-warning">
        These are the "AI suggested" keyword chips shown in the Edit Resume Skills &amp; Tools picker (Portrait
        template). They're actually this curated, per-profession list. Add, edit, or remove keywords here and the
        picker updates immediately, no code deploy needed.
      </p>
      {error && <div className="form-error">{error}</div>}

      <form className="admin-new-template" onSubmit={onCreate}>
        <h2>Add a keyword</h2>
        <div className="admin-new-template-row">
          <div className="field">
            <label>Profession</label>
            <select
              value={newSuggestion.professionKey}
              onChange={(e) => setNewSuggestion({ ...newSuggestion, professionKey: e.target.value })}
              required
            >
              <option value="" disabled>
                Select a profession
              </option>
              {professions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Category</label>
            <select
              value={newSuggestion.category}
              onChange={(e) => setNewSuggestion({ ...newSuggestion, category: e.target.value as "skill" | "tool" })}
            >
              <option value="skill">Skill</option>
              <option value="tool">Tool</option>
            </select>
          </div>
          <div className="field">
            <label>Sort order</label>
            <input type="number" value={newSuggestion.sortOrder} onChange={(e) => setNewSuggestion({ ...newSuggestion, sortOrder: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Keyword</label>
          <input
            value={newSuggestion.label}
            onChange={(e) => setNewSuggestion({ ...newSuggestion, label: e.target.value })}
            placeholder="e.g. Stakeholder management"
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? "Adding…" : "Add keyword"}
        </button>
      </form>

      {loading ? (
        <AdminTableSkeleton columns={5} />
      ) : (
        <>
          <div className="admin-save-all-row">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Filter by profession</label>
              <select value={filterProfession} onChange={(e) => setFilterProfession(e.target.value)}>
                <option value="all">All professions</option>
                {professions.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <SortableHeader label="Profession" sortKey="professionKey" sort={sort} onSort={onSort} />
                <SortableHeader label="Keyword" sortKey="label" sort={sort} onSort={onSort} />
                <SortableHeader label="Category" sortKey="category" sort={sort} onSort={onSort} />
                <SortableHeader label="Sort" sortKey="sortOrder" sort={sort} onSort={onSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => {
                const draft = editing[s.id] ?? { professionKey: s.professionKey, label: s.label, category: s.category, sortOrder: String(s.sortOrder) };
                return (
                  <tr key={s.id}>
                    <td>
                      <select
                        value={draft.professionKey}
                        onChange={(e) => setEditing({ ...editing, [s.id]: { ...draft, professionKey: e.target.value } })}
                      >
                        {professions.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input value={draft.label} onChange={(e) => setEditing({ ...editing, [s.id]: { ...draft, label: e.target.value } })} />
                    </td>
                    <td>
                      <select
                        value={draft.category}
                        onChange={(e) => setEditing({ ...editing, [s.id]: { ...draft, category: e.target.value as "skill" | "tool" } })}
                      >
                        <option value="skill">Skill</option>
                        <option value="tool">Tool</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="admin-sort-input"
                        value={draft.sortOrder}
                        onChange={(e) => setEditing({ ...editing, [s.id]: { ...draft, sortOrder: e.target.value } })}
                      />
                    </td>
                    <td className="admin-row-actions">
                      <button className="btn btn-ghost btn-sm" disabled={busyId === s.id} onClick={() => onSave(s.id)}>
                        Save
                      </button>
                      <button className="btn btn-ghost btn-sm admin-danger" disabled={busyId === s.id} onClick={() => setConfirmDelete(s)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Remove keyword"
          message={`Remove "${confirmDelete.label}" from ${professionLabel(confirmDelete.professionKey)}'s suggestions?`}
          confirmLabel="Remove"
          danger
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </AdminShell>
  );
}
