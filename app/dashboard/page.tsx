"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function monthLabel(m: number) {
  return MONTH_NAMES[m - 1] ?? `Month ${m}`;
}

type DashboardStats = {
  totalClients: number;
  activePaymentsThisMonth: number;
  overdueClients: number;
  revenueThisMonth: number;
  currentPeriod: { year: number; month: number; isClosed: boolean };
};

type ActivityLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "badge-green",
  USER_CREATED: "badge-green",
  LOGIN_SUCCESS: "badge-green",
  UPDATE: "badge-amber",
  USER_ROLE_CHANGED: "badge-amber",
  SETTINGS_UPDATED: "badge-amber",
  USER_PASSWORD_RESET: "badge-amber",
  DELETE: "badge-red",
  USER_DEACTIVATED: "badge-red",
  ACCOUNT_LOCKED: "badge-red",
  LOGIN_FAILED: "badge-red",
  LOGIN_FAILED_UNKNOWN_EMAIL: "badge-red",
  SEND: "badge-blue",
  EXPORT_CSV: "badge-blue",
};

/* ─── Sidebar ─────────────────────────────────────────────────────── */
function Sidebar() {
  const pathname = usePathname();

  const mainLinks = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
    },
    {
      href: "/dashboard/clients",
      label: "Clients",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
    },
    {
      href: "/dashboard/billing",
      label: "Billing",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" /></svg>,
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
      {/* Logo */}
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

      {/* Navigation */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label" style={{ marginTop: 0 }}>Main</p>
        {mainLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className={`nav-item ${active ? "nav-item-active" : ""}`}>
              {link.icon}
              {link.label}
            </Link>
          );
        })}

        <p className="sidebar-section-label">Admin</p>
        {adminLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className={`nav-item ${active ? "nav-item-active" : ""}`}>
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
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

/* ─── KPI Card ────────────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, iconBg, icon, loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  iconBg: string;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <p className="stat-label">{label}</p>
        <div className="stat-icon" style={{ background: iconBg }}>{icon}</div>
      </div>
      {loading ? (
        <div style={{ height: "2rem", width: "5rem", background: "#f3f4f6", borderRadius: "var(--radius)", marginTop: "0.5rem", animation: "pulse 1.5s ease-in-out infinite" }} />
      ) : (
        <>
          <p className="stat-value">{value}</p>
          {sub && <p className="stat-sub">{sub}</p>}
        </>
      )}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────── */
export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [sending, setSending] = useState(false);
  const [reminderMsg, setReminderMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  useEffect(() => {
    async function loadStats() {
      setStatsLoading(true);
      try {
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.stats) setStats(data.stats);
        if (Array.isArray(data?.recentActivity)) setActivity(data.recentActivity);
      } finally {
        setStatsLoading(false);
      }
    }
    loadStats();
  }, []);

  async function sendRemindersSelectedMonth() {
    const confirmed = window.confirm(`Send reminders for ${monthLabel(month)} ${year}?`);
    if (!confirmed) return;

    setSending(true);
    setReminderMsg(null);
    try {
      const res = await fetch("/api/reminders/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });

      const data = await res.json();

      if (!res.ok) {
        setReminderMsg({ type: "error", text: data?.error || "Failed to send reminders" });
        return;
      }

      setReminderMsg({ type: "success", text: `Reminders sent: ${data?.sent ?? 0}` });
    } catch {
      setReminderMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSending(false);
    }
  }

  const periodLabel = stats
    ? `${monthLabel(stats.currentPeriod.month)} ${stats.currentPeriod.year}`
    : `${monthLabel(now.getMonth() + 1)} ${now.getFullYear()}`;

  const navCards = [
    { href: "/dashboard/clients",   label: "Clients",   desc: "Manage client records",     iconBg: "#eff6ff", iconColor: "#2563eb", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
    { href: "/dashboard/billing",   label: "Billing",   desc: "Billing periods & invoices", iconBg: "#faf5ff", iconColor: "#7c3aed", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" /></svg> },
    { href: "/dashboard/payments",  label: "Payments",  desc: "Record & track payments",    iconBg: "#f0fdf4", iconColor: "#16a34a", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg> },
    { href: "/dashboard/reminders", label: "Reminders", desc: "Email reminder settings",    iconBg: "#fff1f2", iconColor: "#e11d48", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg> },
    { href: "/dashboard/audit",     label: "Audit Log", desc: "System activity history",    iconBg: "#fffbeb", iconColor: "#d97706", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg> },
    { href: "/dashboard/users",     label: "Users",     desc: "Manage system users",        iconBg: "#eef2ff", iconColor: "#4f46e5", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg> },
    { href: "/dashboard/settings",  label: "Settings",  desc: "System configuration",       iconBg: "#f9fafb", iconColor: "#374151", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="page-body">

          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle">
                {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                {stats?.currentPeriod.isClosed && (
                  <span className="badge badge-amber" style={{ marginLeft: "0.5rem" }}>Period Closed</span>
                )}
              </p>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="stat-grid">
            <KpiCard
              label="Total Clients"
              value={stats?.totalClients ?? 0}
              sub="All registered clients"
              iconBg="#eff6ff"
              loading={statsLoading}
              icon={<svg className="h-4 w-4" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
            />
            <KpiCard
              label="Payments This Month"
              value={stats?.activePaymentsThisMonth ?? 0}
              sub={periodLabel}
              iconBg="#f0fdf4"
              loading={statsLoading}
              icon={<svg className="h-4 w-4" style={{ color: "#16a34a" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <KpiCard
              label="Overdue Clients"
              value={stats?.overdueClients ?? 0}
              sub="Unpaid this period"
              iconBg="#fef2f2"
              loading={statsLoading}
              icon={<svg className="h-4 w-4" style={{ color: "#dc2626" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
            />
            <KpiCard
              label="Revenue This Month"
              value={stats ? `₱${stats.revenueThisMonth.toLocaleString()}` : "₱0"}
              sub={periodLabel}
              iconBg="#faf5ff"
              loading={statsLoading}
              icon={<svg className="h-4 w-4" style={{ color: "#7c3aed" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>}
            />
          </div>

          {/* Quick Nav + Recent Activity */}
          <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "1fr", marginTop: "1.5rem" }}>
            <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "1fr" }}>

              {/* Two-column layout on wide screens */}
              <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)" }}>

                {/* Quick Nav */}
                <div>
                  <h2 style={{ color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                    Quick Navigation
                  </h2>
                  <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
                    {navCards.map((card) => (
                      <Link
                        key={card.href}
                        href={card.href}
                        style={{ textDecoration: "none" }}
                      >
                        <div
                          className="card"
                          style={{
                            padding: "1rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.625rem",
                            transition: "box-shadow 0.15s",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-xs)"; }}
                        >
                          <div style={{ alignItems: "center", background: card.iconBg, borderRadius: "var(--radius-md)", color: card.iconColor, display: "flex", height: "2.25rem", justifyContent: "center", width: "2.25rem" }}>
                            {card.icon}
                          </div>
                          <div>
                            <div style={{ color: "var(--text-primary)", fontSize: "0.8125rem", fontWeight: 600 }}>{card.label}</div>
                            <div style={{ color: "var(--text-muted)", fontSize: "0.6875rem", marginTop: "0.125rem" }}>{card.desc}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h2 style={{ color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                    Recent Activity
                  </h2>
                  <div className="tbl-wrap">
                    {statsLoading ? (
                      <div style={{ alignItems: "center", display: "flex", justifyContent: "center", padding: "2rem" }}>
                        <div className="spinner" />
                      </div>
                    ) : activity.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", padding: "2rem", textAlign: "center" }}>
                        No activity yet.
                      </div>
                    ) : (
                      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {activity.slice(0, 8).map((log, i) => (
                          <li
                            key={log.id}
                            style={{
                              alignItems: "flex-start",
                              borderBottom: i < Math.min(activity.length, 8) - 1 ? "1px solid #f3f4f6" : "none",
                              display: "flex",
                              gap: "0.625rem",
                              padding: "0.625rem 0.875rem",
                            }}
                          >
                            <span className={`badge ${ACTION_COLORS[log.action] ?? "badge-gray"}`} style={{ marginTop: "0.125rem", flexShrink: 0 }}>
                              {log.action.replace(/_/g, " ")}
                            </span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {log.entityType}
                              </div>
                              <div style={{ color: "var(--text-muted)", fontSize: "0.6875rem" }}>
                                {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div style={{ borderTop: "1px solid #f3f4f6", padding: "0.5rem 0.875rem" }}>
                      <Link href="/dashboard/audit" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 500, textDecoration: "none" }}>
                        View full audit log →
                      </Link>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Reminders */}
          <div style={{ marginTop: "1.5rem" }}>
            <div className="card">
              <div style={{ marginBottom: "1rem" }}>
                <h2 style={{ color: "var(--text-primary)", fontSize: "0.9375rem", fontWeight: 600 }}>Send Payment Reminders</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
                  Trigger email reminders for unpaid billing periods in a specific month.
                </p>
              </div>

              <div style={{ alignItems: "flex-end", display: "flex", flexWrap: "wrap", gap: "0.875rem" }}>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="form-select" style={{ width: "7rem" }}>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Month</label>
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="form-select" style={{ width: "9rem" }}>
                    {Array.from({ length: 12 }).map((_, i) => {
                      const m = i + 1;
                      return <option key={m} value={m}>{monthLabel(m)}</option>;
                    })}
                  </select>
                </div>

                <button onClick={sendRemindersSelectedMonth} disabled={sending} className="btn btn-primary">
                  {sending ? (
                    <><span className="spinner-sm" /> Sending…</>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      Send Reminders
                    </>
                  )}
                </button>

                <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                  Target: <strong style={{ color: "var(--text-primary)" }}>{monthLabel(month)} {year}</strong>
                </span>
              </div>

              {reminderMsg && (
                <div className={`alert ${reminderMsg.type === "success" ? "alert-success" : "alert-error"}`} style={{ marginTop: "0.875rem" }}>
                  <svg className="h-4 w-4 shrink-0" style={{ marginTop: "0.125rem" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    {reminderMsg.type === "success"
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    }
                  </svg>
                  <span>{reminderMsg.text}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
