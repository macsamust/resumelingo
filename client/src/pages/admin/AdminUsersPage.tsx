import { Fragment, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { nextSortState, SortableHeader, SortState } from "../../components/admin/SortableHeader";
import { AdminTableSkeleton } from "../../components/admin/AdminTableSkeleton";
import { Skeleton } from "../../components/common/Skeleton";
import { adminApi, ApiError } from "../../api";
import { AdminUserSummary, Resume, SubscriptionTier } from "../../types";

const TIER_OPTIONS: SubscriptionTier[] = ["starter", "professional", "premium"];

/** Rank for sorting, since alphabetical order ("premium" < "professional" < "starter") wouldn't reflect the actual plan hierarchy. */
const TIER_RANK: Record<SubscriptionTier, number> = { starter: 0, professional: 1, premium: 2 };

type UserSortKey = "name" | "email" | "subscriptionTier" | "resumeCount" | "suspended" | "createdAt";

function compareUsers(a: AdminUserSummary, b: AdminUserSummary, sort: SortState<UserSortKey>): number {
  let result: number;
  switch (sort.key) {
    case "name":
      result = a.name.localeCompare(b.name);
      break;
    case "email":
      result = a.email.localeCompare(b.email);
      break;
    case "subscriptionTier":
      result = TIER_RANK[a.subscriptionTier] - TIER_RANK[b.subscriptionTier];
      break;
    case "resumeCount":
      result = a.resumeCount - b.resumeCount;
      break;
    case "suspended":
      result = Number(a.suspended) - Number(b.suspended);
      break;
    case "createdAt":
      result = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      break;
  }
  return sort.direction === "asc" ? result : -result;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resumesById, setResumesById] = useState<Record<string, Resume[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState<UserSortKey>>({ key: "name", direction: "asc" });

  const load = () => {
    setLoading(true);
    setError(null);
    adminApi
      .listUsers()
      .then((res) => setUsers(res.users))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load users."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q ? users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : users;
    return [...matched].sort((a, b) => compareUsers(a, b, sort));
  }, [users, query, sort]);

  const onSort = (key: UserSortKey) => setSort((prev) => nextSortState(prev, key));

  const toggleExpand = async (user: AdminUserSummary) => {
    if (expandedId === user.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(user.id);
    if (!resumesById[user.id]) {
      try {
        const res = await adminApi.listUserResumes(user.id);
        setResumesById((prev) => ({ ...prev, [user.id]: res.resumes }));
      } catch {
        setResumesById((prev) => ({ ...prev, [user.id]: [] }));
      }
    }
  };

  const onChangeTier = async (user: AdminUserSummary, tier: SubscriptionTier) => {
    setBusyId(user.id);
    try {
      await adminApi.changeUserTier(user.id, tier);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Couldn't change tier.");
    } finally {
      setBusyId(null);
    }
  };

  const onToggleSuspend = async (user: AdminUserSummary) => {
    setBusyId(user.id);
    try {
      await adminApi.setUserSuspended(user.id, !user.suspended);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Couldn't update account status.");
    } finally {
      setBusyId(null);
    }
  };

  const onResetPassword = async (user: AdminUserSummary) => {
    const newPassword = prompt(`Set a new password for ${user.email} (at least 8 characters):`);
    if (!newPassword) return;
    setBusyId(user.id);
    try {
      await adminApi.resetUserPassword(user.id, newPassword);
      alert("Password reset.");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Couldn't reset password.");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (user: AdminUserSummary) => {
    if (!confirm(`Permanently delete ${user.email} and all of their resumes? This cannot be undone.`)) return;
    setBusyId(user.id);
    try {
      await adminApi.deleteUser(user.id);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Couldn't delete account.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>
          Users <span className="app-page-head-count">({users.length})</span>
        </h1>
        <input
          className="admin-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
        />
      </div>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <AdminTableSkeleton columns={7} />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <SortableHeader label="Name" sortKey="name" sort={sort} onSort={onSort} />
              <SortableHeader label="Email" sortKey="email" sort={sort} onSort={onSort} />
              <SortableHeader label="Plan" sortKey="subscriptionTier" sort={sort} onSort={onSort} />
              <SortableHeader label="Resumes" sortKey="resumeCount" sort={sort} onSort={onSort} />
              <SortableHeader label="Status" sortKey="suspended" sort={sort} onSort={onSort} />
              <SortableHeader label="Joined" sortKey="createdAt" sort={sort} onSort={onSort} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <Fragment key={user.id}>
                <tr>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.subscriptionTier}
                      disabled={busyId === user.id}
                      onChange={(e) => onChangeTier(user, e.target.value as SubscriptionTier)}
                    >
                      {TIER_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleExpand(user)} type="button">
                      {user.resumeCount} {expandedId === user.id ? "▲" : "▼"}
                    </button>
                  </td>
                  <td>
                    <span className={`admin-status-tag ${user.suspended ? "suspended" : "active"}`}>
                      {user.suspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="admin-row-actions">
                    <button className="btn btn-ghost btn-sm" disabled={busyId === user.id} onClick={() => onToggleSuspend(user)}>
                      {user.suspended ? "Unsuspend" : "Suspend"}
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={busyId === user.id} onClick={() => onResetPassword(user)}>
                      Reset password
                    </button>
                    <button className="btn btn-ghost btn-sm admin-danger" disabled={busyId === user.id} onClick={() => onDelete(user)}>
                      Delete
                    </button>
                  </td>
                </tr>
                {expandedId === user.id && (
                  <tr className="admin-expanded-row" key={`${user.id}-detail`}>
                    <td colSpan={7}>
                      {!resumesById[user.id] ? (
                        <ul className="admin-resume-list">
                          {[0, 1].map((i) => (
                            <li key={i}>
                              <Skeleton width={180} height={13} radius={4} />
                              <Skeleton width={220} height={12} radius={4} />
                            </li>
                          ))}
                        </ul>
                      ) : resumesById[user.id].length === 0 ? (
                        <p className="hero-note">No resumes yet.</p>
                      ) : (
                        <ul className="admin-resume-list">
                          {resumesById[user.id].map((r) => (
                            <li key={r.id}>
                              <span>{r.title}</span>
                              <span className="hero-note">{r.template?.name ?? r.templateKey} · {r.visibility} · {r.viewCount} views</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="hero-note">
                  No users match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </AdminShell>
  );
}
