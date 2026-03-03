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
  ADMIN: "badge-red",
  MANAGER: "badge-blue",
  ACCOUNTANT: "badge-amber",
  STAFF: "badge-gray",
};

function roleBadge(role: string) {
  return <span className={`badge ${ROLE_BADGE[role] ?? "badge-gray"}`}>{role}</span>;
}

function statusBadge(user: UserRow) {
  if (!user.isActive) return <span className="badge badge-gray">Inactive</span>;
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    return <span className="badge badge-red">Locked</span>;
  }
  return <span className="badge badge-green">Active</span>;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MANAGER" | "ACCOUNTANT" | "STAFF">("ACCOUNTANT");
  const [creating, setCreating] = useState(false);

  // Activity drawer
  const [activityUserId, setActivityUserId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityEmail, setActivityEmail] = useState("");

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (res.status === 403) { setAlert({ type: "error", text: "Access denied. Admin only." }); return; }
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
      if (!res.ok) {
        showAlert("error", data?.error || "Action failed.");
        return;
      }
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
      setNewEmail("");
      setNewPassword("");
      setNewRole("ACCOUNTANT");
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
    <div className="flex min-h-screen">
      <div className="flex-1">
        <div className="page-shell">
          {/* Header */}
          <div className="page-header">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">Dashboard</Link>
                <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Users</span>
              </div>
              <h1 className="page-title">User Management</h1>
              <p className="page-sub">{users.length} user{users.length !== 1 ? "s" : ""} — Admin only</p>
            </div>
            <button onClick={() => setShowCreate((v) => !v)} className="btn btn-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add User
            </button>
          </div>

          {/* Alert */}
          {alert && (
            <div className={`alert mb-4 ${alert.type === "success" ? "alert-success" : "alert-error"}`}>
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                {alert.type === "success"
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />}
              </svg>
              <span>{alert.text}</span>
            </div>
          )}

          {/* Create user form */}
          {showCreate && (
            <div className="card card-pad mb-4">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Create New User</h2>
              <form onSubmit={createUser} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="form-group sm:col-span-2">
                  <label className="form-label">Email</label>
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
                  <label className="form-label">Password</label>
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
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="form-select w-full"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-2 sm:col-span-4">
                  <button type="submit" disabled={creating} className="btn btn-primary">
                    {creating ? "Creating…" : "Create User"}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
              <p className="mt-2 text-xs text-gray-500">
                Password policy: min 8 chars · 1 uppercase · 1 number · 1 special character
              </p>
            </div>
          )}

          {/* Users table */}
          {loading ? (
            <div className="tbl-wrap">
              <div className="flex items-center justify-center py-16">
                <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="ml-3 text-sm text-gray-500">Loading users…</span>
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
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isLocked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="font-medium text-gray-900">{u.email}</div>
                          <div className="font-mono text-xs text-gray-400">{u.id.slice(0, 12)}…</div>
                        </td>
                        <td>{roleBadge(u.role)}</td>
                        <td>{statusBadge(u)}</td>
                        <td>
                          <span className={u.failedLoginCount > 0 ? "font-semibold text-red-600" : "text-gray-500"}>
                            {u.failedLoginCount}
                          </span>
                        </td>
                        <td className="text-xs text-gray-500">
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "Never"}
                        </td>
                        <td className="text-xs text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => viewActivity(u.id, u.email)}
                              className="btn btn-ghost btn-sm"
                              title="View activity"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                              </svg>
                              Activity
                            </button>
                            <button
                              onClick={() => changeRole(u.id, u.role)}
                              disabled={actionLoading === `change_role:${u.id}`}
                              className="btn btn-ghost btn-sm"
                              title="Change role"
                            >
                              Role
                            </button>
                            <button
                              onClick={() => resetPassword(u.id, u.email)}
                              disabled={actionLoading === `reset_password:${u.id}`}
                              className="btn btn-ghost btn-sm"
                              title="Reset password"
                            >
                              Reset PW
                            </button>
                            {isLocked && (
                              <button
                                onClick={() => doAction("unlock", u.id)}
                                disabled={!!actionLoading}
                                className="btn btn-ghost btn-sm text-amber-600"
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
                                className="btn btn-ghost btn-sm text-red-600"
                                title="Deactivate user"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => doAction("activate", u.id)}
                                disabled={!!actionLoading}
                                className="btn btn-ghost btn-sm text-green-600"
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
            </div>
          )}

          {/* Activity drawer */}
          {activityUserId && (
            <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 sm:items-start sm:pt-0">
              <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl sm:h-screen">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Activity History</h2>
                    <p className="text-xs text-gray-500">{activityEmail}</p>
                  </div>
                  <button onClick={() => setActivityUserId(null)} className="btn btn-ghost btn-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {activityLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  ) : activityLogs.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-12">No activity recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="rounded-lg border border-gray-100 p-3">
                          <div className="flex items-center justify-between">
                            <span className="badge badge-gray text-xs">{log.action}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(log.createdAt).toLocaleString("en-US", {
                                month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">{log.entityType}</div>
                          {log.meta && Object.keys(log.meta).length > 0 && (
                            <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
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
      </div>
    </div>
  );
}
