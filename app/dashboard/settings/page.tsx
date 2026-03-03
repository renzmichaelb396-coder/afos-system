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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

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
      if (data?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      }
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
                <span className="text-sm font-medium text-gray-900">Settings</span>
              </div>
              <h1 className="page-title">System Settings</h1>
              <p className="page-sub">Admin-only configuration for AFOS.</p>
            </div>
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

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="ml-3 text-sm text-gray-500">Loading settings…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Main settings form */}
              <div className="lg:col-span-2">
                <form onSubmit={save} className="space-y-6">
                  {/* Billing */}
                  <div className="card card-pad">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                      Billing Configuration
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        <p className="mt-1 text-xs text-gray-400">Day of month the billing cycle starts (1–28).</p>
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
                        <p className="mt-1 text-xs text-gray-400">Days between automated reminder emails.</p>
                      </div>
                    </div>
                  </div>

                  {/* Period lock */}
                  <div className="card card-pad">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      Period Lock
                    </h2>
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Auto-lock closed periods</p>
                        <p className="text-xs text-gray-500">When enabled, closed billing periods are automatically locked to prevent modifications.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => update("period_lock_enabled", settings.period_lock_enabled === "true" ? "false" : "true")}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.period_lock_enabled === "true" ? "bg-blue-600" : "bg-gray-200"}`}
                        role="switch"
                        aria-checked={settings.period_lock_enabled === "true"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.period_lock_enabled === "true" ? "translate-x-5" : "translate-x-0"}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* System identity */}
                  <div className="card card-pad">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      System Identity
                    </h2>
                    <div className="form-group">
                      <label className="form-label">System Name</label>
                      <input
                        type="text"
                        value={settings.system_name}
                        onChange={(e) => update("system_name", e.target.value)}
                        maxLength={64}
                        className="form-input"
                      />
                      <p className="mt-1 text-xs text-gray-400">Display name shown in the UI header.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving || !dirty}
                      className="btn btn-primary"
                    >
                      {saving ? "Saving…" : "Save Settings"}
                    </button>
                    {dirty && (
                      <span className="text-xs text-amber-600">Unsaved changes</span>
                    )}
                  </div>
                </form>
              </div>

              {/* System metadata sidebar */}
              <div className="space-y-4">
                <div className="card card-pad">
                  <h2 className="mb-4 text-sm font-semibold text-gray-900">System Metadata</h2>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">App Version</dt>
                      <dd className="mt-0.5 font-mono text-sm text-gray-900">{meta?.app_version ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Environment</dt>
                      <dd className="mt-0.5">
                        <span className={`badge ${meta?.node_env === "production" ? "badge-green" : "badge-amber"}`}>
                          {meta?.node_env ?? "—"}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Database</dt>
                      <dd className="mt-0.5 text-sm text-gray-900">{meta?.db_provider ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Runtime</dt>
                      <dd className="mt-0.5 text-sm text-gray-900">Node.js (Vercel Edge)</dd>
                    </div>
                  </dl>
                </div>

                <div className="card card-pad">
                  <h2 className="mb-3 text-sm font-semibold text-gray-900">Security Policies</h2>
                  <ul className="space-y-2 text-xs text-gray-600">
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Account lockout after 5 failed attempts
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      15-minute lockout cooldown
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Password: 8+ chars, uppercase, number, special
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      All actions logged to audit trail
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      CSRF protection on all mutations
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Rate limiting on auth endpoints
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
