/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* ─── Types ──────────────────────────────────────────────────────── */
type ClientRow = {
  id: string;
  name: string;
  email?: string | null;
  monthlyFee: number;
  deletedAt?: string | null;
  status: "PAID" | "UNPAID" | "NO_PERIOD";
};

type ClientsResponse = {
  year: number;
  month: number;
  clients: ClientRow[];
  periodExists: boolean;
  periodClosed: boolean;
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
function monthLabel(m: number) { return MONTH_NAMES[m - 1] ?? `Month ${m}`; }

/* ─── Sidebar ─────────────────────────────────────────────────────── */
function Sidebar() {
  const pathname = usePathname();
  const mainLinks = [
    { href: "/dashboard", label: "Dashboard", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg> },
    { href: "/dashboard/clients", label: "Clients", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
    { href: "/dashboard/billing", label: "Billing", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg> },
    { href: "/dashboard/payments", label: "Payments", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg> },
    { href: "/dashboard/reminders", label: "Reminders", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg> },
  ];
  const adminLinks = [
    { href: "/dashboard/audit", label: "Audit Log", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg> },
    { href: "/dashboard/exports", label: "Export History", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg> },
    { href: "/dashboard/users", label: "Users", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
    { href: "/dashboard/settings", label: "Settings", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
        </div>
        <div>
          <div className="sidebar-logo-name">AFOS</div>
          <div className="sidebar-logo-sub">Finance Ops</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <p className="sidebar-section-label" style={{ marginTop: 0 }}>Main</p>
        {mainLinks.map((link) => (
          <Link key={link.href} href={link.href} className={`nav-item ${pathname === link.href ? "nav-item-active" : ""}`}>
            {link.icon}{link.label}
          </Link>
        ))}
        <p className="sidebar-section-label">Admin</p>
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href} className={`nav-item ${pathname === link.href ? "nav-item-active" : ""}`}>
            {link.icon}{link.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }} className="nav-item" style={{ width: "100%", cursor: "pointer", background: "none", border: "none" }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────── */
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
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function loadClients(y: number, m: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(y), month: String(m) });
      if (showDeleted) params.set("includeDeleted", "true");
      const res = await fetch(`/api/clients?${params}`, { credentials: "include" });
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
      showToast("Client added successfully.", "success");
      loadClients(year, month);
    } finally {
      setSubmitting(false);
    }
  }

  async function recordPayment(clientId: string, amount: number, clientName: string) {
    const confirmed = window.confirm(`Record payment of ₱${amount.toLocaleString()} for ${clientName}?`);
    if (!confirmed) return;
    const res = await fetch("/api/payments", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, amount, year, month }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (d?.code === "DUPLICATE_PAYMENT") {
        const override = window.confirm(
          `A payment already exists for ${clientName} this period.\n\nClick OK to record a second payment (admin override), or Cancel to skip.`
        );
        if (!override) return;
        await fetch("/api/payments", {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, amount, year, month, override: true }),
        });
      } else {
        showToast(d?.error || "Failed to record payment.", "error");
        return;
      }
    }
    showToast(`Payment recorded for ${clientName}.`, "success");
    loadClients(year, month);
  }

  async function softDeleteClient(clientId: string, clientName: string) {
    const confirmed = window.confirm(`Archive client "${clientName}"?\n\nThis is a soft delete — historical payments are preserved and the client can be restored by an admin.`);
    if (!confirmed) return;
    const res = await fetch("/api/clients", {
      credentials: "include",
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast(d?.error || "Failed to archive client.", "error");
      return;
    }
    showToast(`"${clientName}" has been archived.`, "success");
    loadClients(year, month);
  }

  async function restoreClient(clientId: string, clientName: string) {
    const confirmed = window.confirm(`Restore client "${clientName}"?`);
    if (!confirmed) return;
    const res = await fetch("/api/clients", {
      credentials: "include",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, action: "restore" }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast(d?.error || "Failed to restore client.", "error");
      return;
    }
    showToast(`"${clientName}" has been restored.`, "success");
    loadClients(year, month);
  }

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.role) setUserRole(d.role); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadClients(year, month);
    const onVis = () => { if (document.visibilityState === "visible") loadClients(year, month); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, showDeleted]);

  const activeClients  = clients.filter((c) => !c.deletedAt);
  const deletedClients = clients.filter((c) => c.deletedAt);
  const paid    = activeClients.filter((c) => c.status === "PAID").length;
  const unpaid  = activeClients.filter((c) => c.status === "UNPAID").length;
  const totalRevenue = activeClients.filter((c) => c.status === "PAID").reduce((s, c) => s + c.monthlyFee, 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="page-body">

          {/* Toast */}
          {toast && (
            <div className={`alert ${toast.type === "success" ? "alert-success" : "alert-error"}`}
              style={{ marginBottom: "1rem", position: "sticky", top: "1rem", zIndex: 50 }}>
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                {toast.type === "success"
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />}
              </svg>
              <span>{toast.msg}</span>
            </div>
          )}

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
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
              <button
                onClick={() => { setShowDeleted((v) => !v); }}
                className={`btn btn-sm ${showDeleted ? "btn-primary" : "btn-secondary"}`}
                title="Toggle archived clients"
              >
                {showDeleted ? "Hide Archived" : "Show Archived"}
              </button>
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
              { label: "Active Clients", value: activeClients.length, color: "var(--text-primary)" },
              { label: "Paid",           value: paid,                  color: "var(--success)" },
              { label: "Unpaid",         value: unpaid,                color: "var(--warning)" },
              { label: "Revenue",        value: `₱${totalRevenue.toLocaleString()}`, color: "var(--accent)" },
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
                <input placeholder="e.g. Acme Corporation" value={name} onChange={(e) => setName(e.target.value)} required className="form-input" />
              </div>
              <div className="form-group" style={{ flex: "1 1 180px", minWidth: "180px" }}>
                <label className="form-label">Email (optional)</label>
                <input placeholder="client@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" />
              </div>
              <div className="form-group" style={{ width: "9rem" }}>
                <label className="form-label">Monthly Fee (₱) <span style={{ color: "var(--danger)" }}>*</span></label>
                <input placeholder="5000" type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} required min="0" step="0.01" className="form-input" />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? <><span className="spinner-sm" /> Adding…</> : <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Add Client
                </>}
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
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Active clients */}
                  {activeClients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{c.name}</span>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{c.email ?? "—"}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>₱{c.monthlyFee.toLocaleString()}</td>
                      <td>
                        {c.status === "PAID" && <span className="badge badge-green">Paid</span>}
                        {c.status === "UNPAID" && <span className="badge badge-amber">Unpaid</span>}
                        {c.status === "NO_PERIOD" && <span className="badge badge-gray">No Period</span>}
                      </td>
                      <td>
                        <div style={{ alignItems: "center", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <Link href="/dashboard/payments" className="btn btn-secondary btn-sm">Payments</Link>
                          {c.status === "UNPAID" && (
                            <button onClick={() => recordPayment(c.id, c.monthlyFee, c.name)} className="btn btn-success btn-sm">
                              Record Payment
                            </button>
                          )}
                          <button onClick={() => softDeleteClient(c.id, c.name)} className="btn btn-danger btn-sm" title="Archive client">
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Archived clients (shown when showDeleted=true) */}
                  {showDeleted && deletedClients.map((c) => (
                    <tr key={c.id} style={{ opacity: 0.55, background: "var(--bg-subtle)" }}>
                      <td>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 500, textDecoration: "line-through" }}>{c.name}</span>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{c.email ?? "—"}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" }}>₱{c.monthlyFee.toLocaleString()}</td>
                      <td><span className="badge badge-gray">Archived</span></td>
                      <td>
                        <div style={{ alignItems: "center", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          {userRole === "ADMIN" && (
                            <button onClick={() => restoreClient(c.id, c.name)} className="btn btn-success btn-sm">
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="tbl-footer">
                {activeClients.length} active client{activeClients.length !== 1 ? "s" : ""} &mdash; {paid} paid, {unpaid} unpaid
                {showDeleted && deletedClients.length > 0 && ` · ${deletedClients.length} archived`}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
