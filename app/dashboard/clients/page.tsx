/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ClientRow = {
  id: string;
  name: string;
  email?: string | null;
  monthlyFee: number;
  createdAt: string;
  status: "PAID" | "UNPAID";
};

type ClientsResponse = {
  year: number;
  month: number;
  clients: ClientRow[];
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function monthLabel(m: number) {
  return MONTH_NAMES[m - 1] ?? `Month ${m}`;
}

export default function ClientsPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [name, setName] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  async function loadClients(y: number, m: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients?year=${y}&month=${m}`, {
        credentials: "include",
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[ClientsPage] loadClients failed", res.status, text);
        setClients([]);
        return;
      }

      const data = (await res.json()) as ClientsResponse;

      const nextYear = Number((data as any)?.year ?? y);
      const nextMonth = Number((data as any)?.month ?? m);

      if (nextYear !== y) setYear(nextYear);
      if (nextMonth !== m) setMonth(nextMonth);

      setClients(Array.isArray((data as any)?.clients) ? (data as any).clients : []);
    } catch (err) {
      console.error("[ClientsPage] loadClients exception", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/clients", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          monthlyFee: Number(monthlyFee),
        }),
      });

      setName("");
      setMonthlyFee("");
      loadClients(year, month);
    } finally {
      setSubmitting(false);
    }
  }

  async function recordPayment(clientId: string, amount: number, clientName: string) {
    const confirmed = window.confirm(`Record payment of ₱${amount.toLocaleString()} for ${clientName}?`);
    if (!confirmed) return;

    await fetch("/api/payments", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, amount, year, month }),
    });

    loadClients(year, month);
  }

  useEffect(() => {
    loadClients(year, month);

    const onVis = () => {
      if (document.visibilityState === "visible") loadClients(year, month);
    };

    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [year, month]);

  const paid = clients.filter((c) => c.status === "PAID").length;
  const unpaid = clients.filter((c) => c.status === "UNPAID").length;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar back link for mobile */}
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
                <span className="text-sm font-medium text-gray-900">Clients</span>
              </div>
              <h1 className="page-title">Clients</h1>
              <p className="page-sub">
                Viewing payment status for{" "}
                <span className="font-medium text-gray-700">{monthLabel(month)} {year}</span>
              </p>
            </div>

            {/* Period selector + Export */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.open(`/api/export/clients?year=${year}&month=${month}`, "_blank")}
                className="btn btn-secondary"
                title="Export clients to CSV"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export CSV
              </button>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="form-select w-24"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="form-select w-36"
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1;
                  return (
                    <option key={m} value={m}>{monthLabel(m)}</option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="stat-label">Total Clients</div>
              <div className="stat-value">{clients.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Paid</div>
              <div className="stat-value text-green-600">{paid}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unpaid</div>
              <div className="stat-value text-amber-600">{unpaid}</div>
            </div>
          </div>

          {/* Add client form */}
          <div className="card card-pad mb-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Add New Client</h2>
            <form onSubmit={createClient} className="flex flex-wrap items-end gap-4">
              <div className="form-group min-w-[200px] flex-1">
                <label className="form-label">Client Name</label>
                <input
                  placeholder="e.g. Acme Corporation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group w-40">
                <label className="form-label">Monthly Fee (₱)</label>
                <input
                  placeholder="e.g. 5000"
                  type="number"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="form-input"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Adding…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Client
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Clients table */}
          {loading ? (
            <div className="tbl-wrap">
              <div className="flex items-center justify-center py-16">
                <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="ml-3 text-sm text-gray-500">Loading clients…</span>
              </div>
            </div>
          ) : clients.length === 0 ? (
            <div className="tbl-wrap">
              <div className="empty-state">
                <svg className="mb-4 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <p className="empty-title">No clients found</p>
                <p className="empty-sub">Add your first client using the form above.</p>
              </div>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Client Name</th>
                    <th>Monthly Fee</th>
                    <th>Status</th>
                    <th>Member Since</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium text-gray-900">{c.name}</td>
                      <td>₱{c.monthlyFee.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${c.status === "PAID" ? "badge-green" : "badge-amber"}`}>
                          {c.status === "PAID" ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                      <td className="text-gray-500">
                        {new Date(c.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <Link href="/dashboard/payments" className="btn btn-secondary btn-sm">
                            Payments
                          </Link>
                          {c.status === "UNPAID" && (
                            <button
                              onClick={() => recordPayment(c.id, c.monthlyFee, c.name)}
                              className="btn btn-primary btn-sm"
                            >
                              Record Payment
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
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
