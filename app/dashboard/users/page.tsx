/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "STAFF";
  isActive: boolean;
  failedLoginCount: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

type ActivityLog = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  meta: any;
};

const ROLES = ["ADMIN", "MANAGER", "ACCOUNTANT", "STAFF"] as const;

const ROLE_BADGE: Record<string, string> = {
  ADMIN:      "badge-red",
  MANAGER:    "badge-blue",
  ACCOUNTANT: "badge-amber",
  STAFF:      "badge-gray",
};

function statusBadge(user: UserRow) {
  if (!user.isActive) return <span className="badge badge-gray">Inactive</span>;
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    return <span className="badge badge-red">Locked</span>;
  }
  return <span className="badge badge-green">Active</span>;
}

export default function UsersPage() {
  const [users, setUsers]               = useState<UserRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [alert, setAlert]               = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showCreate, setShowCreate]   = useState(false);
  const [newEmail, setNewEmail]       = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole]         = useState<"ADMIN" | "MANAGER" | "ACCOUNTANT" | "STAFF">("ACCOUNTANT");
  const [creating, setCreating]       = useState(false);

  const [activityUserId, setActivityUserId]   = useState<string | null>(null);
  const [activityLogs, setActivityLogs]       = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityEmail, setActivityEmail]     = useState("");

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (res.status === 403) { showAlert("error", "Access denied. Admin only."); return; }
      const data = await res.json();
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  function showAlert(type: "success" | "error", text: string) {
    setAlert({ type, text });
    setTimeout(() => setAlert(null), 5000);
  }

  async function doAction(action: string, userId: string, extra?: Record<string, unknown>) {
    setActionLoading(`${action}:${userId}`);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { showAlert("error", data?.error || "Action failed."); return; }
      showAlert("success", "Action completed successfully.");
      await loadUsers();
    } finally {
      setActionLoading(null);
    }
  }

  async function changeRole(userId: string, currentRole: string) {
    const role = window.prompt(
      `Change role for this user.\nCurrent: ${currentRole}\nEnter new role (ADMIN, MANAGER, ACCOUNTANT, STAFF):`,
      currentRole
    );
    if (!role || !ROLES.includes(role as any)) return;
    await doAction("change_role", userId, { role });
  }

  async function resetPassword(userId: string, email: string) {
    const newPw = window.prompt(
      `Reset password for ${email}.\n\nPassword must be 8+ chars, 1 uppercase, 1 number, 1 special char.\n\nEnter new password:`
    );
    if (!newPw) return;
    await doAction("reset_password", userId, { newPassword: newPw });
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        const issues = data?.issues;
        if (issues && Array.isArray(issues)) {
          showAlert("error", issues.map((i: any) => i.message).join("; "));
        } else {
          showAlert("error", data?.error || "Failed to create user.");
        }
        return;
      }
      showAlert("success", `User ${newEmail} created successfully.`);
      setNewEmail(""); setNewPassword(""); setNewRole("ACCOUNTANT");
      setShowCreate(false);
      await loadUsers();
    } finally {
      setCreating(false);
    }
  }

  async function viewActivity(userId: string, email: string) {
    setActivityUserId(userId);
    setActivityEmail(email);
    setActivityLoading(true);
    setActivityLogs([]);
    try {
      const res = await fetch(`/api/users/${userId}/activity`);
      const data = await res.json();
      setActivityLogs(Array.isArray(data?.logs) ? data.logs : []);
    } finally {
      setActivityLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="page-body">

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="breadcrumb-sep">›</span>
            <span style={{ color: "var(--text-secondary)" }}>Users</span>
          </div>

          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">User Management</h1>
              <p className="page-subtitle">
                {users.length} user{users.length !== 1 ? "s" : ""} — Admin only
              </p>
            </div>
            <button onClick={() => setShowCreate((v) => !v)} className="btn btn-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {showCreate ? "Cancel" : "Add User"}
            </button>
          </div>

          {/* Alert */}
          {alert && (
            <div className={`alert ${alert.type === "success" ? "alert-success" : "alert-error"}`} style={{ marginBottom: "1rem" }}>
              <svg className="h-4 w-4 shrink-0" style={{ marginTop: "0.125rem" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                {alert.type === "success"
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />}
              </svg>
              <span>{alert.text}</span>
            </div>
          )}

          {/* Create user form */}
          {showCreate && (
            <div className="card" style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem" }}>
                Create New User
              </h2>
              <form onSubmit={createUser} style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label className="form-label">Email <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    placeholder="user@example.com"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Min 8 chars, 1 upper, 1 num, 1 special"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)} className="form-select" style={{ width: "100%" }}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ alignItems: "center", display: "flex", gap: "0.5rem", gridColumn: "1 / -1" }}>
                  <button type="submit" disabled={creating} className="btn btn-primary">
                    {creating ? <><span className="spinner-sm" /> Creating…</> : "Create User"}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
              <p style={{ color: "var(--text-muted)", fontSize: "0.6875rem", marginTop: "0.625rem" }}>
                Password policy: min 8 chars · 1 uppercase · 1 number · 1 special character
              </p>
            </div>
          )}

          {/* Users table */}
          {loading ? (
            <div className="tbl-wrap">
              <div style={{ alignItems: "center", display: "flex", gap: "0.75rem", justifyContent: "center", padding: "4rem 1rem" }}>
                <div className="spinner" />
                <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Loading users…</span>
              </div>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Failed Logins</th>
                    <th>Last Login</th>
                    <th>Created</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isLocked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{u.email}</div>
                          <div style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.6875rem" }}>{u.id.slice(0, 12)}…</div>
                        </td>
                        <td>
                          <span className={`badge ${ROLE_BADGE[u.role] ?? "badge-gray"}`}>{u.role}</span>
                        </td>
                        <td>{statusBadge(u)}</td>
                        <td>
                          <span style={{ color: u.failedLoginCount > 0 ? "var(--danger)" : "var(--text-muted)", fontWeight: u.failedLoginCount > 0 ? 600 : 400 }}>
                            {u.failedLoginCount}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "Never"}
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                          {new Date(u.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </td>
                        <td>
                          <div style={{ alignItems: "center", display: "flex", gap: "0.25rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                            <button onClick={() => viewActivity(u.id, u.email)} className="btn btn-secondary btn-sm" title="View activity">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                              </svg>
                              Activity
                            </button>
                            <button
                              onClick={() => changeRole(u.id, u.role)}
                              disabled={actionLoading === `change_role:${u.id}`}
                              className="btn btn-secondary btn-sm"
                              title="Change role"
                            >
                              Role
                            </button>
                            <button
                              onClick={() => resetPassword(u.id, u.email)}
                              disabled={actionLoading === `reset_password:${u.id}`}
                              className="btn btn-secondary btn-sm"
                              title="Reset password"
                            >
                              Reset PW
                            </button>
                            {isLocked && (
                              <button
                                onClick={() => doAction("unlock", u.id)}
                                disabled={!!actionLoading}
                                className="btn btn-secondary btn-sm"
                                style={{ color: "var(--warning)" }}
                                title="Unlock account"
                              >
                                Unlock
                              </button>
                            )}
                            {u.isActive ? (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Deactivate ${u.email}? They will not be able to log in.`)) {
                                    doAction("deactivate", u.id);
                                  }
                                }}
                                disabled={!!actionLoading}
                                className="btn btn-danger btn-sm"
                                title="Deactivate user"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => doAction("activate", u.id)}
                                disabled={!!actionLoading}
                                className="btn btn-success btn-sm"
                                title="Activate user"
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="tbl-footer">
                {users.length} user{users.length !== 1 ? "s" : ""} total
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Activity drawer */}
      {activityUserId && (
        <div
          style={{
            background: "rgba(0,0,0,0.35)",
            bottom: 0,
            left: 0,
            position: "fixed",
            right: 0,
            top: 0,
            zIndex: 50,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setActivityUserId(null); }}
        >
          <div
            style={{
              background: "#fff",
              boxShadow: "var(--shadow-xl)",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              marginLeft: "auto",
              maxWidth: "28rem",
              width: "100%",
            }}
          >
            {/* Drawer header */}
            <div style={{ alignItems: "center", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", padding: "1rem 1.25rem" }}>
              <div>
                <h2 style={{ color: "var(--text-primary)", fontSize: "0.9375rem", fontWeight: 600 }}>Activity History</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.125rem" }}>{activityEmail}</p>
              </div>
              <button onClick={() => setActivityUserId(null)} className="btn btn-secondary btn-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
              {activityLoading ? (
                <div style={{ alignItems: "center", display: "flex", justifyContent: "center", padding: "3rem 0" }}>
                  <div className="spinner" />
                </div>
              ) : activityLogs.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "3rem 0", textAlign: "center" }}>
                  No activity recorded.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {activityLogs.map((log) => (
                    <div key={log.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.75rem" }}>
                      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
                        <span className="badge badge-gray">{log.action.replace(/_/g, " ")}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.6875rem" }}>
                          {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{log.entityType}</div>
                      {log.meta && Object.keys(log.meta).length > 0 && (
                        <pre style={{ background: "#f9fafb", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "0.6875rem", marginTop: "0.5rem", overflowX: "auto", padding: "0.5rem" }}>
                          {JSON.stringify(log.meta, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
