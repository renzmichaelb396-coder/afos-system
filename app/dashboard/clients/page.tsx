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
  const [year, setYear]   = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const [clients, setClients]       = useState<ClientRow[]>([]);
  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr]       = useState<string | null>(null);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  async function loadClients(y: number, m: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients?year=${y}&month=${m}`, { credentials: "include" });
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) { setClients([]); return; }
      const data = (await res.json()) as ClientsResponse;
      const nextYear  = Number((data as any)?.year  ?? y);
      const nextMonth = Number((data as any)?.month ?? m);
      if (nextYear  !== y) setYear(nextYear);
      if (nextMonth !== m) setMonth(nextMonth);
      setClients(Array.isArray((data as any)?.clients) ? (data as any).clients : []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    if (!name.trim()) { setFormErr("Client name is required."); return; }
    if (!monthlyFee || Number(monthlyFee) <= 0) { setFormErr("Monthly fee must be greater than 0."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined, monthlyFee: Number(monthlyFee) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFormErr(d?.error || "Failed to add client.");
        return;
      }
      setName(""); setEmail(""); setMonthlyFee("");
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
    const onVis = () => { if (document.visibilityState === "visible") loadClients(year, month); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [year, month]);

  const paid   = clients.filter((c) => c.status === "PAID").length;
  const unpaid = clients.filter((c) => c.status === "UNPAID").length;
  const totalRevenue = clients.filter((c) => c.status === "PAID").reduce((s, c) => s + c.monthlyFee, 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="page-body">

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="breadcrumb-sep">›</span>
            <span style={{ color: "var(--text-secondary)" }}>Clients</span>
          </div>

          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Clients</h1>
              <p className="page-subtitle">
                Payment status for <strong>{monthLabel(month)} {year}</strong>
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <button
                onClick={() => window.open(`/api/export/clients?year=${year}&month=${month}`, "_blank")}
                className="btn btn-secondary btn-sm"
                title="Export to CSV"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export CSV
              </button>
              <select value={year}  onChange={(e) => setYear(Number(e.target.value))}  className="form-select" style={{ width: "6rem" }}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="form-select" style={{ width: "8.5rem" }}>
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1;
                  return <option key={m} value={m}>{monthLabel(m)}</option>;
                })}
              </select>
            </div>
          </div>

          {/* KPI strip */}
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "1.5rem" }}>
            {[
              { label: "Total Clients", value: clients.length, color: "var(--text-primary)" },
              { label: "Paid",          value: paid,           color: "var(--success)" },
              { label: "Unpaid",        value: unpaid,         color: "var(--warning)" },
              { label: "Revenue",       value: `₱${totalRevenue.toLocaleString()}`, color: "var(--accent)" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <p className="stat-label">{s.label}</p>
                <p className="stat-value" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Add client form */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem" }}>
              Add New Client
            </h2>
            <form onSubmit={createClient} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "0.75rem" }}>
              <div className="form-group" style={{ flex: "1 1 180px", minWidth: "180px" }}>
                <label className="form-label">Client Name <span style={{ color: "var(--danger)" }}>*</span></label>
                <input
                  placeholder="e.g. Acme Corporation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ flex: "1 1 180px", minWidth: "180px" }}>
                <label className="form-label">Email (optional)</label>
                <input
                  placeholder="client@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ width: "9rem" }}>
                <label className="form-label">Monthly Fee (₱) <span style={{ color: "var(--danger)" }}>*</span></label>
                <input
                  placeholder="5000"
                  type="number"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="form-input"
                />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? (
                  <><span className="spinner-sm" /> Adding…</>
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
            {formErr && (
              <div className="alert alert-error" style={{ marginTop: "0.75rem" }}>
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{formErr}</span>
              </div>
            )}
          </div>

          {/* Clients table */}
          {loading ? (
            <div className="tbl-wrap">
              <div style={{ alignItems: "center", display: "flex", gap: "0.75rem", justifyContent: "center", padding: "4rem 1rem" }}>
                <div className="spinner" />
                <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Loading clients…</span>
              </div>
            </div>
          ) : clients.length === 0 ? (
            <div className="tbl-wrap">
              <div className="empty-state">
                <div className="empty-icon">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
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
                    <th>Email</th>
                    <th>Monthly Fee</th>
                    <th>Status</th>
                    <th>Member Since</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{c.name}</span>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{c.email ?? "—"}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>₱{c.monthlyFee.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${c.status === "PAID" ? "badge-green" : "badge-amber"}`}>
                          {c.status === "PAID" ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {new Date(c.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td>
                        <div style={{ alignItems: "center", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <Link href="/dashboard/payments" className="btn btn-secondary btn-sm">
                            Payments
                          </Link>
                          {c.status === "UNPAID" && (
                            <button
                              onClick={() => recordPayment(c.id, c.monthlyFee, c.name)}
                              className="btn btn-success btn-sm"
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
              <div className="tbl-footer">
                {clients.length} client{clients.length !== 1 ? "s" : ""} &mdash; {paid} paid, {unpaid} unpaid
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
