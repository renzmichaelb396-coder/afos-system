"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Settings = {
  billing_cycle_day: string;
  reminder_interval_days: string;
  period_lock_enabled: string;
  system_name: string;
};

type Meta = {
  app_version: string;
  node_env: string;
  db_provider: string;
};

const DEFAULT_SETTINGS: Settings = {
  billing_cycle_day: "1",
  reminder_interval_days: "7",
  period_lock_enabled: "false",
  system_name: "AFOS",
};

const CHECK_ICON = (
  <svg style={{ color: "var(--success)", flexShrink: 0, height: "0.875rem", marginTop: "0.125rem", width: "0.875rem" }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [meta, setMeta]         = useState<Meta | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [alert, setAlert]       = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dirty, setDirty]       = useState(false);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (res.status === 403) {
        setAlert({ type: "error", text: "Access denied. Admin only." });
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data?.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      if (data?.meta) setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSettings(); }, []);

  function update(key: keyof Settings, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: "error", text: data?.error || "Failed to save settings." });
        return;
      }
      setAlert({ type: "success", text: "Settings saved successfully." });
      setDirty(false);
      setTimeout(() => setAlert(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  const lockEnabled = settings.period_lock_enabled === "true";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="page-body">

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="breadcrumb-sep">›</span>
            <span style={{ color: "var(--text-secondary)" }}>Settings</span>
          </div>

          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">System Settings</h1>
              <p className="page-subtitle">Admin-only configuration for AFOS.</p>
            </div>
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

          {loading ? (
            <div style={{ alignItems: "center", display: "flex", gap: "0.75rem", justifyContent: "center", padding: "5rem 0" }}>
              <div className="spinner" />
              <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Loading settings…</span>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "1fr" }}>
              <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "minmax(0,1fr) 280px" }}>

                {/* Left column — settings form */}
                <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                  {/* Billing config */}
                  <div className="card">
                    <div className="card-header">
                      <svg className="h-4 w-4" style={{ color: "var(--primary)" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                      <span>Billing Configuration</span>
                    </div>
                    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
                      <div className="form-group">
                        <label className="form-label">Billing Cycle Day</label>
                        <input
                          type="number"
                          min={1}
                          max={28}
                          value={settings.billing_cycle_day}
                          onChange={(e) => update("billing_cycle_day", e.target.value)}
                          className="form-input"
                        />
                        <p style={{ color: "var(--text-muted)", fontSize: "0.6875rem", marginTop: "0.25rem" }}>
                          Day of month the billing cycle starts (1–28).
                        </p>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Reminder Interval (days)</label>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={settings.reminder_interval_days}
                          onChange={(e) => update("reminder_interval_days", e.target.value)}
                          className="form-input"
                        />
                        <p style={{ color: "var(--text-muted)", fontSize: "0.6875rem", marginTop: "0.25rem" }}>
                          Days between automated reminder emails.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Period lock */}
                  <div className="card">
                    <div className="card-header">
                      <svg className="h-4 w-4" style={{ color: "var(--warning)" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      <span>Period Lock</span>
                    </div>
                    <div style={{ alignItems: "center", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between", padding: "1rem" }}>
                      <div>
                        <p style={{ color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 500 }}>Auto-lock closed periods</p>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                          Closed billing periods are automatically locked to prevent modifications.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => update("period_lock_enabled", lockEnabled ? "false" : "true")}
                        role="switch"
                        aria-checked={lockEnabled}
                        style={{
                          background: lockEnabled ? "var(--primary)" : "#d1d5db",
                          border: "none",
                          borderRadius: "9999px",
                          cursor: "pointer",
                          flexShrink: 0,
                          height: "1.5rem",
                          marginLeft: "1rem",
                          padding: 0,
                          position: "relative",
                          transition: "background 0.2s",
                          width: "2.75rem",
                        }}
                      >
                        <span
                          style={{
                            background: "#fff",
                            borderRadius: "9999px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                            display: "block",
                            height: "1.25rem",
                            left: lockEnabled ? "calc(100% - 1.375rem)" : "0.125rem",
                            position: "absolute",
                            top: "0.125rem",
                            transition: "left 0.2s",
                            width: "1.25rem",
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* System identity */}
                  <div className="card">
                    <div className="card-header">
                      <svg className="h-4 w-4" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>System Identity</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">System Name</label>
                      <input
                        type="text"
                        value={settings.system_name}
                        onChange={(e) => update("system_name", e.target.value)}
                        maxLength={64}
                        className="form-input"
                        style={{ maxWidth: "20rem" }}
                      />
                      <p style={{ color: "var(--text-muted)", fontSize: "0.6875rem", marginTop: "0.25rem" }}>
                        Display name shown in the UI header.
                      </p>
                    </div>
                  </div>

                  {/* Save bar */}
                  <div style={{ alignItems: "center", display: "flex", gap: "0.75rem" }}>
                    <button type="submit" disabled={saving || !dirty} className="btn btn-primary">
                      {saving ? <><span className="spinner-sm" /> Saving…</> : "Save Settings"}
                    </button>
                    {dirty && (
                      <span style={{ color: "var(--warning)", fontSize: "0.75rem", fontWeight: 500 }}>
                        Unsaved changes
                      </span>
                    )}
                  </div>
                </form>

                {/* Right column — metadata + security */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                  {/* System metadata */}
                  <div className="card">
                    <div className="card-header">
                      <svg className="h-4 w-4" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                      <span>System Metadata</span>
                    </div>
                    <dl style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                      {[
                        { label: "App Version", value: meta?.app_version ?? "—", mono: true },
                        { label: "Environment", value: meta?.node_env ?? "—", badge: meta?.node_env === "production" ? "badge-green" : "badge-amber" },
                        { label: "Database", value: meta?.db_provider ?? "—" },
                        { label: "Runtime", value: "Node.js (Vercel)" },
                      ].map(({ label, value, mono, badge }) => (
                        <div key={label}>
                          <dt style={{ color: "var(--text-muted)", fontSize: "0.6875rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</dt>
                          <dd style={{ marginTop: "0.25rem" }}>
                            {badge
                              ? <span className={`badge ${badge}`}>{value}</span>
                              : <span style={{ color: "var(--text-primary)", fontFamily: mono ? "monospace" : "inherit", fontSize: "0.8125rem" }}>{value}</span>}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {/* Security policies */}
                  <div className="card">
                    <div className="card-header">
                      <svg className="h-4 w-4" style={{ color: "var(--success)" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      <span>Security Policies</span>
                    </div>
                    <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {[
                        "Account lockout after 5 failed attempts",
                        "15-minute lockout cooldown",
                        "Password: 8+ chars, uppercase, number, special",
                        "All actions logged to audit trail",
                        "CSRF protection on all mutations",
                        "Rate limiting on auth endpoints",
                      ].map((item) => (
                        <li key={item} style={{ alignItems: "flex-start", display: "flex", gap: "0.5rem" }}>
                          {CHECK_ICON}
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
