"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

/* ─── Constants ──────────────────────────────────────────────────── */
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
function monthLabel(m: number) { return MONTH_NAMES[m - 1] ?? `Month ${m}`; }

/* ─── Sidebar (identical to all other pages) ─────────────────────── */
function Sidebar() {
  const pathname = usePathname();

  const mainLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
    },
    {
      href: "/dashboard/clients",
      label: "Clients",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
    },
    {
      href: "/dashboard/billing",
      label: "Billing",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
    },
    {
      href: "/dashboard/payments",
      label: "Payments",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
    },
    {
      href: "/dashboard/reminders",
      label: "Reminders",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>,
    },
  ];

  const adminLinks = [
    {
      href: "/dashboard/audit",
      label: "Audit Log",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>,
    },
    {
      href: "/dashboard/users",
      label: "Users",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
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
            {link.icon}
            {link.label}
          </Link>
        ))}
        <p className="sidebar-section-label">Admin</p>
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href} className={`nav-item ${pathname === link.href ? "nav-item-active" : ""}`}>
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="nav-item"
          style={{ width: "100%", cursor: "pointer", background: "none", border: "none" }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────── */
export default function RemindersPage() {
  const now = new Date();
  const [year, setYear]   = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState<{ type: "success" | "error"; text: string } | null>(null);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  async function sendReminders() {
    const confirmed = window.confirm(
      `Send payment reminders for ${monthLabel(month)} ${year}?\n\nThis will email all clients with unpaid status for this period.`
    );
    if (!confirmed) return;
    setSending(true);
    setResult(null);
    try {
      const res  = await fetch("/api/reminders/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ type: "error", text: data?.error || "Failed to send reminders." });
        return;
      }
      setResult({
        type: "success",
        text: `Reminders sent! ${data?.sent ?? 0} email(s) dispatched for ${monthLabel(month)} ${year}.`,
      });
    } catch {
      setResult({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="page-body">

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="breadcrumb-sep">›</span>
            <span style={{ color: "var(--text-secondary)" }}>Reminders</span>
          </div>

          {/* Page header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Payment Reminders</h1>
              <p className="page-subtitle">Send email reminders to clients with unpaid balances.</p>
            </div>
          </div>

          {/* Content */}
          <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "minmax(0,1fr) 280px" }}>

            {/* Send card */}
            <div className="card">
              <div className="card-header">
                <svg className="h-4 w-4" style={{ color: "var(--primary)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Send Reminders
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1.25rem" }}>
                Select a billing period and trigger email reminders for all clients marked as unpaid.
              </p>

              <div style={{ alignItems: "flex-end", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="form-select"
                    style={{ width: "7rem" }}
                  >
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="form-select"
                    style={{ width: "10rem" }}
                  >
                    {Array.from({ length: 12 }).map((_, i) => {
                      const m = i + 1;
                      return <option key={m} value={m}>{monthLabel(m)}</option>;
                    })}
                  </select>
                </div>
                <button onClick={sendReminders} disabled={sending} className="btn btn-primary">
                  {sending ? (
                    <><div className="spinner-sm" /> Sending…</>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      Send Reminders for {monthLabel(month)} {year}
                    </>
                  )}
                </button>
              </div>

              {result && (
                <div className={`alert ${result.type === "success" ? "alert-success" : "alert-error"}`} style={{ marginTop: "1.25rem" }}>
                  <svg className="h-4 w-4 shrink-0" style={{ marginTop: "0.125rem" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    {result.type === "success"
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />}
                  </svg>
                  <span>{result.text}</span>
                </div>
              )}
            </div>

            {/* Info sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="card">
                <div className="card-header">
                  <svg className="h-4 w-4" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  How It Works
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {[
                    "Select the billing period (year and month).",
                    "Click \"Send Reminders\" to trigger the email batch.",
                    <>All clients with an <strong>UNPAID</strong> status for that period will receive an email.</>,
                    "The action is recorded in the Audit Log.",
                  ].map((text, i) => (
                    <div key={i} style={{ alignItems: "flex-start", display: "flex", gap: "0.625rem" }}>
                      <span style={{
                        alignItems: "center",
                        background: "var(--accent-light)",
                        borderRadius: "9999px",
                        color: "var(--accent)",
                        display: "flex",
                        flexShrink: 0,
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        height: "1.25rem",
                        justifyContent: "center",
                        marginTop: "0.125rem",
                        width: "1.25rem",
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", lineHeight: 1.5 }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <svg className="h-4 w-4" style={{ color: "var(--warning)" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  Requirements
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {[
                    { icon: "warn", text: "SMTP credentials must be configured in environment variables." },
                    { icon: "warn", text: "REMINDERS_SECRET must be set to authenticate the trigger." },
                    { icon: "ok",   text: "Clients without email addresses will be skipped." },
                  ].map(({ icon, text }) => (
                    <div key={text} style={{ alignItems: "flex-start", display: "flex", gap: "0.5rem" }}>
                      <svg className="h-4 w-4 shrink-0" style={{ color: icon === "ok" ? "var(--success)" : "var(--warning)", marginTop: "0.125rem" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        {icon === "ok"
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />}
                      </svg>
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", lineHeight: 1.5 }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
