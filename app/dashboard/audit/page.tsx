/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AuditLog = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  meta: any;
  createdAt: string;
};

function actionBadge(action: string) {
  const a = action.toUpperCase();
  if (a.includes("CREATE") || a.includes("ADD") || a.includes("INSERT")) {
    return <span className="badge badge-green">{action}</span>;
  }
  if (a.includes("DELETE") || a.includes("REMOVE")) {
    return <span className="badge badge-red">{action}</span>;
  }
  if (a.includes("UPDATE") || a.includes("EDIT") || a.includes("CLOSE")) {
    return <span className="badge badge-amber">{action}</span>;
  }
  if (a.includes("LOGIN") || a.includes("AUTH")) {
    return <span className="badge badge-blue">{action}</span>;
  }
  return <span className="badge badge-gray">{action}</span>;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      setLogs(Array.isArray(data?.logs) ? data.logs : Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex min-h-screen">
      <div className="flex-1">
        <div className="page-shell">
          {/* Header */}
          <div className="page-header">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
                  Dashboard
                </Link>
                <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Audit Log</span>
              </div>
              <h1 className="page-title">Audit Log</h1>
              <p className="page-sub">System activity history — all actions are recorded.</p>
            </div>

            <button
              onClick={load}
              className="btn btn-secondary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Log entries */}
          {loading ? (
            <div className="tbl-wrap">
              <div className="flex items-center justify-center py-16">
                <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="ml-3 text-sm text-gray-500">Loading audit log…</span>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="tbl-wrap">
              <div className="empty-state">
                <svg className="mb-4 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                <p className="empty-title">No audit entries yet</p>
                <p className="empty-sub">Actions will appear here as they are performed.</p>
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
                    <th>Timestamp</th>
                    <th className="text-right">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <>
                      <tr key={l.id}>
                        <td>{actionBadge(l.action)}</td>
                        <td className="font-medium text-gray-700">{l.entityType}</td>
                        <td>
                          <span className="font-mono text-xs text-gray-500">{l.entityId}</span>
                        </td>
                        <td className="text-gray-500">
                          {new Date(l.createdAt).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td>
                          <div className="flex justify-end">
                            {l.meta && Object.keys(l.meta).length > 0 && (
                              <button
                                onClick={() => toggleExpand(l.id)}
                                className="btn btn-ghost btn-sm"
                              >
                                {expanded.has(l.id) ? (
                                  <>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                    </svg>
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
                        <tr key={`${l.id}-meta`} className="bg-gray-50">
                          <td colSpan={5} className="px-5 pb-4 pt-0">
                            <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
                              {JSON.stringify(l.meta, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
