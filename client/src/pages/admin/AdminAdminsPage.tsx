import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { AdminListSkeleton } from "../../components/admin/AdminListSkeleton";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { useToast } from "../../components/common/Toast";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminApi, ApiError } from "../../api";
import { AdminAccount } from "../../types";

const EMPTY_NEW = { name: "", email: "", password: "" };

/**
 * Lets an admin invite/remove other admin accounts. Previously the only way
 * to add a second admin was the one-time ADMIN_EMAIL/ADMIN_PASSWORD
 * bootstrap secrets or hand-writing SQL against D1 directly — no in-app
 * path existed at all.
 */
export function AdminAdminsPage() {
  const { admin: currentAdmin } = useAdminAuth();
  const { showToast } = useToast();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAdmin, setNewAdmin] = useState(EMPTY_NEW);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminAccount | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Client-side filter — same reasoning as Templates/Role Descriptions: the
  // admin roster is small (a handful of accounts at most), so there's no
  // real benefit to pushing search server-side here.
  const filteredAdmins = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [admins, query]);

  const load = () => {
    setLoading(true);
    setError(null);
    adminApi
      .listAdmins()
      .then((res) => setAdmins(res.admins))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load admin accounts."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await adminApi.createAdmin(newAdmin);
      setNewAdmin(EMPTY_NEW);
      showToast("success", `Added ${newAdmin.email} as an admin.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add admin.");
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    try {
      await adminApi.deleteAdmin(confirmDelete.id);
      showToast("success", `Removed ${confirmDelete.email}.`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't remove admin.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>
          Admin Accounts <span className="app-page-head-count">({admins.length})</span>
        </h1>
        <input
          className="admin-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
        />
      </div>
      <p className="hero-note admin-plan-warning">
        Anyone added here gets full access to the entire admin console: every user's data, billing, and every
        catalog page. There's no role/permission split (yet); this is all or nothing access.
      </p>
      {error && <div className="form-error">{error}</div>}

      <form className="admin-new-template" onSubmit={onCreate}>
        <h2>Add an admin</h2>
        <div className="admin-new-template-row">
          <div className="field">
            <label>Name</label>
            <input value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              minLength={8}
              placeholder="At least 8 characters"
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              required
            />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? "Adding…" : "Add admin"}
        </button>
      </form>

      {loading ? (
        <AdminListSkeleton rows={3} />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredAdmins.map((a) => {
              const isSelf = a.id === currentAdmin?.id;
              return (
                <tr key={a.id}>
                  <td>
                    {a.name} {isSelf && <span className="hero-note">(you)</span>}
                  </td>
                  <td>{a.email}</td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="admin-row-actions">
                    <button
                      className="btn btn-ghost btn-sm admin-danger"
                      disabled={isSelf || admins.length <= 1 || busyId === a.id}
                      title={isSelf ? "You can't remove your own account." : admins.length <= 1 ? "Can't remove the last admin." : undefined}
                      onClick={() => setConfirmDelete(a)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredAdmins.length === 0 && (
              <tr>
                <td colSpan={4} className="hero-note">
                  No admins match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Remove admin"
          message={`Remove ${confirmDelete.email}'s admin access? They'll no longer be able to log into the admin console.`}
          confirmLabel="Remove"
          danger
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </AdminShell>
  );
}
