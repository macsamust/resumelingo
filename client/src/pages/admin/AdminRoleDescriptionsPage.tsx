import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { adminApi, catalogApi, ApiError } from "../../api";
import { AdminListSkeleton } from "../../components/admin/AdminListSkeleton";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { useToast } from "../../components/common/Toast";
import { AdminRoleDescription, ProfessionSummary } from "../../types";

interface Draft {
  keywords: string; // comma-separated for editing
  category: string;
  descriptor: string;
  traits: string; // comma-separated, must resolve to exactly 3
  outcome: string;
  keyTraits: string; // comma-separated, must resolve to exactly 3
  professionKey: string; // "" = none (keyword-matched / fallback row)
}

const EMPTY_NEW: Draft = { keywords: "", category: "", descriptor: "", traits: "", outcome: "", keyTraits: "", professionKey: "" };

function toDraft(r: AdminRoleDescription): Draft {
  return {
    keywords: r.keywords.join(", "),
    category: r.category,
    descriptor: r.descriptor,
    traits: r.traits.join(", "),
    outcome: r.outcome,
    keyTraits: r.keyTraits.join(", "),
    professionKey: r.professionKey ?? "",
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Parses the draft's traits/keyTraits fields, returning an error message if either doesn't resolve to exactly 3 items. */
function parseTraitTriples(draft: Draft): { traits: [string, string, string]; keyTraits: [string, string, string] } | string {
  const traits = splitList(draft.traits);
  const keyTraits = splitList(draft.keyTraits);
  if (traits.length !== 3) return "Traits must be exactly 3 comma-separated phrases.";
  if (keyTraits.length !== 3) return "Key traits must be exactly 3 comma-separated phrases.";
  return { traits: [traits[0], traits[1], traits[2]], keyTraits: [keyTraits[0], keyTraits[1], keyTraits[2]] };
}

/**
 * Admin console for role descriptions — the sentence-building blocks behind
 * every profession's About statement (see server's ContentGenerator.ts
 * buildSummary/buildOtherSummary and config/roleDescriptions.ts's
 * findRoleDescriptionForProfession/findRoleDescription). Reads as
 * "AI-generated" to the person using it, but is this curated list. Two
 * kinds of row:
 *   - Matched to a named profession (professionKey set) — used for that
 *     profession's own About statement, e.g. Software Engineer.
 *   - Keyword-matched (professionKey unset) — only used for the "Other"
 *     profession, matched against the resume's title (e.g. "comedian"), or
 *     the single generic fallback row when nothing matches.
 * Both kinds fill in the same template: "{descriptor} who combines
 * {traits[0]}, {traits[1]}, and {traits[2]} to {outcome}. Known for/Key
 * traits include {keyTraits[0]}, {keyTraits[1]}, and {keyTraits[2]}."
 */
export function AdminRoleDescriptionsPage() {
  const { showToast } = useToast();
  const [descriptions, setDescriptions] = useState<AdminRoleDescription[]>([]);
  const [professions, setProfessions] = useState<ProfessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, Draft>>({});
  const [newRole, setNewRole] = useState<Draft>(EMPTY_NEW);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  // Which role description (if any) is the subject of the delete confirm
  // dialog — replaces window.confirm(), same pattern as AdminUsersPage.
  const [confirmDelete, setConfirmDelete] = useState<AdminRoleDescription | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([adminApi.listRoleDescriptions(), catalogApi.listProfessions()])
      .then(([roleRes, professionsRes]) => {
        setDescriptions(roleRes.roleDescriptions);
        setProfessions(professionsRes.professions);
        const nextEditing: Record<string, Draft> = {};
        roleRes.roleDescriptions.forEach((r) => {
          nextEditing[r.id] = toDraft(r);
        });
        setEditing(nextEditing);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load role descriptions."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const professionLabel = (key: string) => professions.find((p) => p.key === key)?.label ?? key;

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newRole.category.trim() || !newRole.descriptor.trim() || !newRole.outcome.trim()) return;
    const parsed = parseTraitTriples(newRole);
    if (typeof parsed === "string") {
      setError(parsed);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await adminApi.createRoleDescription({
        keywords: splitList(newRole.keywords),
        category: newRole.category.trim(),
        descriptor: newRole.descriptor.trim(),
        traits: parsed.traits,
        outcome: newRole.outcome.trim(),
        keyTraits: parsed.keyTraits,
        professionKey: newRole.professionKey || null,
      });
      setNewRole(EMPTY_NEW);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add role description.");
    } finally {
      setCreating(false);
    }
  };

  const onSave = async (id: string) => {
    const draft = editing[id];
    const parsed = parseTraitTriples(draft);
    if (typeof parsed === "string") {
      showToast("error", parsed);
      return;
    }
    setBusyId(id);
    try {
      await adminApi.updateRoleDescription(id, {
        keywords: splitList(draft.keywords),
        category: draft.category.trim(),
        descriptor: draft.descriptor.trim(),
        traits: parsed.traits,
        outcome: draft.outcome.trim(),
        keyTraits: parsed.keyTraits,
        professionKey: draft.professionKey || null,
      });
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't save role description.");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    const r = confirmDelete;
    setBusyId(r.id);
    try {
      await adminApi.deleteRoleDescription(r.id);
      showToast("success", `"${r.category}" was deleted.`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't delete role description.");
    } finally {
      setBusyId(null);
    }
  };

  // Client-side filter — this catalog is small (one row per profession plus
  // a handful of "Other" sub-categories), so unlike the Users/Resumes lists
  // there's no real benefit to pushing search server-side here.
  const filteredDescriptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return descriptions;
    return descriptions.filter((r) => {
      const label = r.professionKey ? professionLabel(r.professionKey) : "";
      return (
        r.category.toLowerCase().includes(q) ||
        r.descriptor.toLowerCase().includes(q) ||
        label.toLowerCase().includes(q) ||
        r.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptions, query, professions]);

  const professionRows = filteredDescriptions.filter((r) => r.professionKey);
  const otherRows = filteredDescriptions.filter((r) => !r.professionKey);

  const renderRow = (r: AdminRoleDescription) => {
    const draft = editing[r.id] ?? toDraft(r);
    return (
      <div key={r.id} className="admin-new-template" style={{ marginBottom: 16 }}>
        <h2>
          {r.professionKey ? professionLabel(r.professionKey) : r.category}
          {r.isFallback && <span className="hero-note"> (generic fallback)</span>}
        </h2>
        <div className="admin-new-template-row">
          <div className="field">
            <label>Profession (leave as "None" for an "Other" sub-category or the fallback)</label>
            <select
              value={draft.professionKey}
              onChange={(e) => setEditing({ ...editing, [r.id]: { ...draft, professionKey: e.target.value } })}
            >
              <option value="">None (keyword-matched / fallback)</option>
              {professions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Category (unique label, e.g. "entertainer")</label>
            <input value={draft.category} onChange={(e) => setEditing({ ...editing, [r.id]: { ...draft, category: e.target.value } })} />
          </div>
        </div>
        <div className="field">
          <label>Keywords (comma-separated — ignored for rows matched to a profession)</label>
          <input value={draft.keywords} onChange={(e) => setEditing({ ...editing, [r.id]: { ...draft, keywords: e.target.value } })} />
        </div>
        <div className="field">
          <label>Descriptor</label>
          <input value={draft.descriptor} onChange={(e) => setEditing({ ...editing, [r.id]: { ...draft, descriptor: e.target.value } })} />
        </div>
        <div className="field">
          <label>Traits (exactly 3, comma-separated)</label>
          <input value={draft.traits} onChange={(e) => setEditing({ ...editing, [r.id]: { ...draft, traits: e.target.value } })} />
        </div>
        <div className="field">
          <label>Outcome</label>
          <input value={draft.outcome} onChange={(e) => setEditing({ ...editing, [r.id]: { ...draft, outcome: e.target.value } })} />
        </div>
        <div className="field">
          <label>Key traits (exactly 3, comma-separated)</label>
          <input value={draft.keyTraits} onChange={(e) => setEditing({ ...editing, [r.id]: { ...draft, keyTraits: e.target.value } })} />
        </div>
        <div className="admin-row-actions">
          <button className="btn btn-ghost btn-sm" disabled={busyId === r.id} onClick={() => onSave(r.id)}>
            Save
          </button>
          <button className="btn btn-ghost btn-sm admin-danger" disabled={busyId === r.id} onClick={() => setConfirmDelete(r)}>
            Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>
          Role Descriptions <span className="app-page-head-count">({descriptions.length})</span>
        </h1>
        <input
          className="admin-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by profession, category, descriptor, or keyword…"
        />
      </div>
      <p className="hero-note admin-plan-warning">
        These build every profession's About-statement voice: "{"{descriptor}"} who combines{" "}
        <strong>trait 1, 2, 3</strong> to <strong>outcome</strong>. Known for <strong>key trait 1, 2, 3</strong>."
        Reads as AI-generated, but is this curated list. A row matched to a Profession is used for that profession's
        resumes directly; a row with no Profession is only used under "Other" — matched by keyword against the
        resume's title, or as the generic fallback when nothing matches.
      </p>
      {error && <div className="form-error">{error}</div>}

      <form className="admin-new-template" onSubmit={onCreate}>
        <h2>Add a role description</h2>
        <div className="admin-new-template-row">
          <div className="field">
            <label>Profession (leave as "None" for an "Other" sub-category)</label>
            <select value={newRole.professionKey} onChange={(e) => setNewRole({ ...newRole, professionKey: e.target.value })}>
              <option value="">None (keyword-matched, "Other" only)</option>
              {professions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Category (unique label, e.g. "entertainer")</label>
            <input value={newRole.category} onChange={(e) => setNewRole({ ...newRole, category: e.target.value })} required />
          </div>
        </div>
        <div className="field">
          <label>Keywords (comma-separated, matched against the resume title — ignored if a Profession is set)</label>
          <input value={newRole.keywords} onChange={(e) => setNewRole({ ...newRole, keywords: e.target.value })} placeholder="e.g. comedian, comedy" />
        </div>
        <div className="field">
          <label>Descriptor (e.g. "versatile public performer")</label>
          <input value={newRole.descriptor} onChange={(e) => setNewRole({ ...newRole, descriptor: e.target.value })} required />
        </div>
        <div className="field">
          <label>Traits (exactly 3, comma-separated)</label>
          <input
            value={newRole.traits}
            onChange={(e) => setNewRole({ ...newRole, traits: e.target.value })}
            placeholder="sharp writing, deep audience connection, precise timing"
            required
          />
        </div>
        <div className="field">
          <label>Outcome (e.g. "evoke laughter")</label>
          <input value={newRole.outcome} onChange={(e) => setNewRole({ ...newRole, outcome: e.target.value })} required />
        </div>
        <div className="field">
          <label>Key traits (exactly 3, comma-separated)</label>
          <input
            value={newRole.keyTraits}
            onChange={(e) => setNewRole({ ...newRole, keyTraits: e.target.value })}
            placeholder="originality, an authentic stage persona, strong resilience under pressure"
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? "Adding…" : "Add role description"}
        </button>
      </form>

      {loading ? (
        <AdminListSkeleton rows={5} />
      ) : filteredDescriptions.length === 0 ? (
        <p className="hero-note">No role descriptions match "{query}".</p>
      ) : (
        <>
          {professionRows.length > 0 && (
            <>
              <h2 style={{ marginTop: 32 }}>Named professions</h2>
              <div className="admin-role-description-list">{professionRows.map(renderRow)}</div>
            </>
          )}

          {otherRows.length > 0 && (
            <>
              <h2 style={{ marginTop: 32 }}>"Other" sub-categories &amp; fallback</h2>
              <div className="admin-role-description-list">{otherRows.map(renderRow)}</div>
            </>
          )}
        </>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete role description"
          message={`Delete the "${confirmDelete.category}" role description?${
            confirmDelete.isFallback
              ? " This is the generic fallback used when no keyword matches — deleting it may leave some 'Other' resumes without a summary voice."
              : ""
          }`}
          confirmLabel="Delete"
          danger
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </AdminShell>
  );
}
