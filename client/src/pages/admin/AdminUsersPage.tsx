import { Fragment, useEffect, useRef, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { nextSortState, SortableHeader, SortState } from "../../components/admin/SortableHeader";
import { AdminTableSkeleton } from "../../components/admin/AdminTableSkeleton";
import { Skeleton } from "../../components/common/Skeleton";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { useToast } from "../../components/common/Toast";
import { adminApi, ApiError } from "../../api";
import { AdminUserSummary, Resume, SubscriptionTier } from "../../types";
import { downloadBlob } from "../../utils/downloadBlob";

const TIER_OPTIONS: SubscriptionTier[] = ["starter", "professional", "premium"];
const PAGE_SIZE = 25;

type UserSortKey = "name" | "email" | "subscriptionTier" | "resumeCount" | "suspended" | "createdAt" | "lastActivityAt";

export function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resumesById, setResumesById] = useState<Record<string, Resume[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState<UserSortKey>>({ key: "name", direction: "asc" });
  // Which user (if any) is currently the subject of a confirm/prompt-style
  // dialog — replaces window.confirm()/prompt() with the app's own styled
  // Modal-based dialogs (see ConfirmDialog), which are
  // reliably dismissible with Escape and don't look out of place next to
  // the rest of the UI.
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AdminUserSummary | null>(null);
  const [sendingResetId, setSendingResetId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  // Which row's "more actions" menu (Suspend/Unsuspend, Delete) is open —
  // same kebab-menu pattern as DashboardPage's resume cards: Send password
  // reset stays as the one visible button, the moderation toggle and the
  // destructive action move behind one trigger instead of three buttons
  // crowding the row.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Closes an open row menu on any click outside it — trigger/dropdown stop
  // propagation (see below) so the same click that opens a menu doesn't
  // immediately close it again. Same pattern as DashboardPage.
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allOnPageSelected = users.length > 0 && users.every((u) => selected.has(u.id));

  // Paginated, searched, and sorted server-side (see AdminApi.listUsers) —
  // this table no longer loads every account on every visit, so it's not
  // the kind of thing that gets slower as the user base grows.
  const load = () => {
    setLoading(true);
    setError(null);
    adminApi
      .listUsers({ page, pageSize: PAGE_SIZE, q: query.trim() || undefined, sortKey: sort.key, sortDirection: sort.direction })
      .then((res) => {
        setUsers(res.users);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load users."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, sort]);

  // Debounced search: waits for a pause in typing rather than firing a
  // request on every keystroke, and resets back to page 1 since the result
  // set (and therefore what "page 2" even means) changes with the query.
  // Skips its own first run (component mount) since the [page, sort] effect
  // above already covers the initial load.
  const isFirstQueryRun = useRef(true);
  useEffect(() => {
    if (isFirstQueryRun.current) {
      isFirstQueryRun.current = false;
      return;
    }
    const handle = setTimeout(() => {
      if (page !== 1) setPage(1);
      else load();
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Selection is cleared on every reload (new page, search, sort, or after a
  // bulk action) rather than tracked across pages — "select all" always
  // means "every row currently on screen," not a hidden cross-page state.
  useEffect(() => setSelected(new Set()), [users]);

  const onSort = (key: UserSortKey) => setSort((prev) => nextSortState(prev, key));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      if (allOnPageSelected) return new Set();
      return new Set(users.map((u) => u.id));
    });
  };

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
      showToast("error", err instanceof ApiError ? err.message : "Couldn't change tier.");
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
      showToast("error", err instanceof ApiError ? err.message : "Couldn't update account status.");
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Sends the user a "forgot your password" reset-link email — same flow as
   * the login page's own reset, rather than the admin setting a specific
   * password directly. That old flow meant the admin always knew the
   * account's real password afterward, with no expiry and no notice to the
   * user; this reset link is one-time-use and time-limited like any other.
   */
  const onSendPasswordReset = async (user: AdminUserSummary) => {
    setSendingResetId(user.id);
    try {
      await adminApi.sendUserPasswordReset(user.id);
      showToast("success", `Password reset email sent to ${user.email}.`);
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't send password reset email.");
    } finally {
      setSendingResetId(null);
    }
  };

  const onDelete = async () => {
    if (!confirmDeleteUser) return;
    try {
      await adminApi.deleteUser(confirmDeleteUser.id);
      showToast("success", `${confirmDeleteUser.email} was deleted.`);
      setConfirmDeleteUser(null);
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't delete account.");
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await adminApi.exportUsersCsv({ q: query.trim() || undefined, sortKey: sort.key, sortDirection: sort.direction });
      downloadBlob(blob, `users-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't export users.");
    } finally {
      setExporting(false);
    }
  };

  const onBulkSuspend = async (suspended: boolean) => {
    setBulkBusy(true);
    try {
      const ids = Array.from(selected);
      const res = await adminApi.bulkSetUsersSuspended(ids, suspended);
      showToast("success", `${suspended ? "Suspended" : "Unsuspended"} ${res.count} account${res.count === 1 ? "" : "s"}.`);
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't update the selected accounts.");
    } finally {
      setBulkBusy(false);
    }
  };

  const onBulkDelete = async () => {
    setBulkBusy(true);
    try {
      const ids = Array.from(selected);
      const res = await adminApi.bulkDeleteUsers(ids);
      showToast("success", `Deleted ${res.count} account${res.count === 1 ? "" : "s"}.`);
      setConfirmBulkDelete(false);
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't delete the selected accounts.");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>
          Users <span className="app-page-head-count">({total})</span>
        </h1>
        <div className="admin-page-head-actions">
          <input
            className="admin-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
          />
          <button className="btn btn-ghost btn-sm" type="button" disabled={exporting || total === 0} onClick={onExport}>
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      {selected.size > 0 && (
        <div className="admin-bulk-bar">
          <span className="hero-note">{selected.size} selected</span>
          <button className="btn btn-ghost btn-sm" type="button" disabled={bulkBusy} onClick={() => onBulkSuspend(true)}>
            Suspend selected
          </button>
          <button className="btn btn-ghost btn-sm" type="button" disabled={bulkBusy} onClick={() => onBulkSuspend(false)}>
            Unsuspend selected
          </button>
          <button
            className="btn btn-ghost btn-sm admin-danger"
            type="button"
            disabled={bulkBusy}
            onClick={() => setConfirmBulkDelete(true)}
          >
            Delete selected
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}
      {loading ? (
        <AdminTableSkeleton columns={10} />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} aria-label="Select all users on this page" />
              </th>
              <SortableHeader label="Name" sortKey="name" sort={sort} onSort={onSort} />
              <SortableHeader label="Email" sortKey="email" sort={sort} onSort={onSort} />
              <SortableHeader label="Plan" sortKey="subscriptionTier" sort={sort} onSort={onSort} />
              <th>Billing</th>
              <SortableHeader label="Resumes" sortKey="resumeCount" sort={sort} onSort={onSort} />
              <SortableHeader label="Status" sortKey="suspended" sort={sort} onSort={onSort} />
              <SortableHeader label="Last Activity" sortKey="lastActivityAt" sort={sort} onSort={onSort} />
              <SortableHeader label="Joined" sortKey="createdAt" sort={sort} onSort={onSort} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <Fragment key={user.id}>
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(user.id)}
                      onChange={() => toggleOne(user.id)}
                      aria-label={`Select ${user.email}`}
                    />
                  </td>
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
                    {user.subscriptionTier === "starter" ? (
                      <span className="hero-note">None</span>
                    ) : user.stripeSubscriptionActive ? (
                      <span className="admin-status-tag active" title={user.stripeCustomerId ?? undefined}>
                        Stripe
                      </span>
                    ) : (
                      <span className="admin-status-tag suspended" title="Paid tier with no active Stripe subscription, set manually by an admin.">
                        Comped
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleExpand(user)}
                      type="button"
                      aria-expanded={expandedId === user.id}
                      aria-label={`${expandedId === user.id ? "Hide" : "Show"} ${user.email}'s resumes (${user.resumeCount})`}
                    >
                      {user.resumeCount} {expandedId === user.id ? "▲" : "▼"}
                    </button>
                  </td>
                  <td>
                    <span className={`admin-status-tag ${user.suspended ? "suspended" : "active"}`}>
                      {user.suspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td>
                    {user.lastActivityAt ? (
                      new Date(user.lastActivityAt).toLocaleDateString()
                    ) : (
                      <span className="hero-note">Never</span>
                    )}
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="admin-row-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={busyId === user.id || sendingResetId === user.id}
                      onClick={() => onSendPasswordReset(user)}
                    >
                      {sendingResetId === user.id ? "Sending…" : "Send password reset"}
                    </button>
                    <div className="resume-menu">
                      <button
                        className="resume-menu-trigger"
                        disabled={busyId === user.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((cur) => (cur === user.id ? null : user.id));
                        }}
                        aria-label="More actions"
                        aria-expanded={openMenuId === user.id}
                      >
                        &#8942;
                      </button>
                      {openMenuId === user.id && (
                        <div className="resume-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              onToggleSuspend(user);
                            }}
                          >
                            {user.suspended ? "Unsuspend" : "Suspend"}
                          </button>
                          <button
                            className="danger"
                            onClick={() => {
                              setOpenMenuId(null);
                              setConfirmDeleteUser(user);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === user.id && (
                  <tr className="admin-expanded-row" key={`${user.id}-detail`}>
                    <td colSpan={10}>
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
            {users.length === 0 && (
              <tr>
                <td colSpan={10} className="hero-note">
                  {query ? `No users match "${query}".` : "No users yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {!loading && totalPages > 1 && (
        <div className="admin-pagination">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Previous
          </button>
          <span className="hero-note">
            Page {page} of {totalPages}
          </span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      )}
      {confirmDeleteUser && (
        <ConfirmDialog
          title="Delete account"
          message={`Permanently delete ${confirmDeleteUser.email} and all of their resumes? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={onDelete}
          onCancel={() => setConfirmDeleteUser(null)}
        />
      )}
      {confirmBulkDelete && (
        <ConfirmDialog
          title="Delete accounts"
          message={`Permanently delete ${selected.size} account${selected.size === 1 ? "" : "s"} and all of their resumes? This cannot be undone.`}
          confirmLabel={bulkBusy ? "Deleting…" : "Delete"}
          danger
          onConfirm={onBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}
    </AdminShell>
  );
}
