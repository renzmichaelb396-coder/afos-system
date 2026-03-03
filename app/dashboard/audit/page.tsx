/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AuditLog = {
  id: string;
  userId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  meta: any;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "badge-green",
  USER_CREATED: "badge-green",
  LOGIN_SUCCESS: "badge-green",
  UPDATE: "badge-amber",
  USER_ROLE_CHANGED: "badge-amber",
  USER_ACTIVATED: "badge-amber",
  SETTINGS_UPDATED: "badge-amber",
  USER_PASSWORD_RESET: "badge-amber",
  USER_UNLOCKED: "badge-amber",
  DELETE: "badge-red",
  USER_DEACTIVATED: "badge-red",
  ACCOUNT_LOCKED: "badge-red",
  LOGIN_FAILED: "badge-red",
  LOGIN_FAILED_UNKNOWN_EMAIL: "badge-red",
  SEND: "badge-blue",
  EXPORT_CSV: "badge-blue",
  CLOSE: "badge-gray",
  LOCK_PERIOD: "badge-gray",
};

export default function AuditPage() {
  const [logs, setLogs]             = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());

  const [search, setSearch]             = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterFrom, setFilterFrom]     = useState("");
  const [filterTo, setFilterTo]         = useState("");
  const [page, setPage]                 = useState(1);

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "50");
    if (search)       p.set("search",  search);
    if (filterAction) p.set("action",  filterAction);
    if (filterUserId) p.set("userId",  filterUserId);
    if (filterFrom)   p.set("from",    filterFrom);
    if (filterTo)     p.set("to",      filterTo);
    return p.toString();
  }, [page, search, filterAction, filterUserId, filterFrom, filterTo]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?${buildQuery()}`);
      if (res.status === 401) { window.location.href = "/login"; return; }
      const data = await res.json();
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      if (data?.pagination) setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function applyFilters() { setPage(1); load(); }

  function clearFilters() {
    setSearch(""); setFilterAction(""); setFilterUserId("");
    setFilterFrom(""); setFilterTo(""); setPage(1);
  }

  function exportCsv() {
    const p = new URLSearchParams();
    if (search)       p.set("search",  search);
    if (filterAction) p.set("action",  filterAction);
    if (filterUserId) p.set("userId",  filterUserId);
    if (filterFrom)   p.set("from",    filterFrom);
    if (filterTo)     p.set("to",      filterTo);
    window.open(`/api/export/audit?${p.toString()}`, "_blank");
  }

  const hasFilters = search || filterAction || filterUserId || filterFrom || filterTo;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="page-body">

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="breadcrumb-sep">›</span>
            <span style={{ color: "var(--text-secondary)" }}>Audit Log</span>
          </div>

          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Audit Log</h1>
              <p className="page-subtitle">
                {pagination.total > 0
                  ? `${pagination.total.toLocaleString()} entries — page ${pagination.page} of ${pagination.totalPages}`
                  : "All system actions are recorded here."}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button onClick={exportCsv} className="btn btn-secondary btn-sm">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export CSV
              </button>
              <button onClick={load} className="btn btn-secondary btn-sm">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="Action, entity type, entity ID…"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Action</label>
                <input
                  type="text"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="e.g. LOGIN_FAILED"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">User ID</label>
                <input
                  type="text"
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="Paste user ID…"
                  className="form-input"
                  style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">From</label>
                <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">To</label>
                <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="form-input" />
              </div>
            </div>
            <div style={{ alignItems: "center", display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <button onClick={applyFilters} className="btn btn-primary btn-sm">Apply Filters</button>
              {hasFilters && (
                <button onClick={clearFilters} className="btn btn-secondary btn-sm">Clear</button>
              )}
              {hasFilters && (
                <span style={{ color: "var(--warning)", fontSize: "0.75rem" }}>
                  Filters active — {pagination.total} result{pagination.total !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="tbl-wrap">
              <div style={{ alignItems: "center", display: "flex", gap: "0.75rem", justifyContent: "center", padding: "4rem 1rem" }}>
                <div className="spinner" />
                <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Loading…</span>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="tbl-wrap">
              <div className="empty-state">
                <div className="empty-icon">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                  </svg>
                </div>
                <p className="empty-title">{hasFilters ? "No matching entries" : "No audit entries yet"}</p>
                <p className="empty-sub">{hasFilters ? "Try adjusting your filters." : "Actions will appear here as they are performed."}</p>
              </div>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>User ID</th>
                    <th>Timestamp</th>
                    <th style={{ textAlign: "right" }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <>
                      <tr key={l.id}>
                        <td>
                          <span className={`badge ${ACTION_COLORS[l.action] ?? "badge-gray"}`}>
                            {l.action.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{l.entityType}</td>
                        <td>
                          <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.6875rem" }}>
                            {l.entityId.slice(0, 16)}…
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.6875rem" }}>
                            {l.userId ? l.userId.slice(0, 12) + "…" : "—"}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                          {new Date(l.createdAt).toLocaleString("en-US", {
                            year: "numeric", month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit", second: "2-digit",
                          })}
                        </td>
                        <td>
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            {l.meta && Object.keys(l.meta).length > 0 && (
                              <button onClick={() => toggleExpand(l.id)} className="btn btn-secondary btn-sm">
                                {expanded.has(l.id) ? (
                                  <>
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                    </svg>
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                    Details
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded.has(l.id) && (
                        <tr key={`${l.id}-meta`}>
                          <td colSpan={6} style={{ background: "#f9fafb", paddingBottom: "0.875rem", paddingTop: 0 }}>
                            <pre style={{
                              background: "#fff",
                              border: "1px solid #e5e7eb",
                              borderRadius: "var(--radius)",
                              color: "var(--text-secondary)",
                              fontSize: "0.6875rem",
                              lineHeight: 1.6,
                              margin: "0 1.25rem",
                              overflowX: "auto",
                              padding: "0.75rem",
                            }}>
                              {JSON.stringify(l.meta, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="tbl-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total.toLocaleString()} entries)
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <button onClick={() => setPage(1)} disabled={page === 1} className="btn btn-secondary btn-sm">«</button>
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm">‹ Prev</button>
                    <span style={{ color: "var(--text-primary)", fontSize: "0.8125rem", fontWeight: 600, padding: "0 0.5rem" }}>{page}</span>
                    <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="btn btn-secondary btn-sm">Next ›</button>
                    <button onClick={() => setPage(pagination.totalPages)} disabled={page === pagination.totalPages} className="btn btn-secondary btn-sm">»</button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
