"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PaymentRow = {
  id: string;
  clientId: string;
  amount: number;
  paidAt: string;
  client: { name: string };
};

type PaymentsResponse = {
  year: number;
  month: number;
  isClosed?: boolean;
  payments: PaymentRow[];
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function monthLabel(m: number) {
  return MONTH_NAMES[m - 1] ?? `Month ${m}`;
}

export default function PaymentsPage() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear]   = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [closed, setClosed]     = useState(false);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, [now]);

  async function load(y: number, m: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments?year=${y}&month=${m}`);
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) { setPayments([]); setClosed(false); return; }
      const data = (await res.json()) as PaymentsResponse;
      setYear(Number(data?.year ?? y));
      setMonth(Number(data?.month ?? m));
      setPayments(Array.isArray(data?.payments) ? data.payments : []);
      setClosed(Boolean(data?.isClosed));
    } finally {
      setLoading(false);
    }
  }

  async function deletePayment(paymentId: string, clientName: string, amount: number) {
    const confirmed = window.confirm(`Delete payment of ₱${amount.toLocaleString()} for ${clientName}?`);
    if (!confirmed) return;
    await fetch("/api/payments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });
    load(year, month);
  }

  useEffect(() => {
    load(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(
    () => payments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [payments]
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="page-body">

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="breadcrumb-sep">›</span>
            <span style={{ color: "var(--text-secondary)" }}>Payments</span>
          </div>

          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Payments</h1>
              <p className="page-subtitle">
                Payment records for <strong>{monthLabel(month)} {year}</strong>
                {closed && <span className="badge badge-gray" style={{ marginLeft: "0.5rem" }}>Closed</span>}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <button
                onClick={() => window.open(`/api/export/payments?year=${year}&month=${month}`, "_blank")}
                className="btn btn-secondary btn-sm"
                title="Export to CSV"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export CSV
              </button>
              <select
                value={year}
                onChange={(e) => { const y = Number(e.target.value); setYear(y); load(y, month); }}
                className="form-select"
                style={{ width: "6rem" }}
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select
                value={month}
                onChange={(e) => { const m = Number(e.target.value); setMonth(m); load(year, m); }}
                className="form-select"
                style={{ width: "8.5rem" }}
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1;
                  return <option key={m} value={m}>{monthLabel(m)}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Closed period banner */}
          {closed && (
            <div className="alert alert-info" style={{ marginBottom: "1.25rem" }}>
              <svg className="h-4 w-4 shrink-0" style={{ marginTop: "0.125rem" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <div>
                <strong>Billing period is closed.</strong>
                {" "}Payments are read-only. Deletions and new entries are blocked.
              </div>
            </div>
          )}

          {/* Stats strip */}
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1.5rem" }}>
            <div className="stat-card">
              <p className="stat-label">Total Collected</p>
              <p className="stat-value" style={{ color: "var(--success)" }}>₱{total.toLocaleString()}</p>
              <p className="stat-sub">{monthLabel(month)} {year}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Transactions</p>
              <p className="stat-value">{payments.length}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Period Status</p>
              <p className="stat-value" style={{ color: closed ? "var(--text-secondary)" : "var(--success)" }}>
                {closed ? "Closed" : "Open"}
              </p>
            </div>
          </div>

          {/* Payments table */}
          {loading ? (
            <div className="tbl-wrap">
              <div style={{ alignItems: "center", display: "flex", gap: "0.75rem", justifyContent: "center", padding: "4rem 1rem" }}>
                <div className="spinner" />
                <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Loading payments…</span>
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="tbl-wrap">
              <div className="empty-state">
                <div className="empty-icon">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
                <p className="empty-title">No payments recorded</p>
                <p className="empty-sub">
                  Record payments from the{" "}
                  <Link href="/dashboard/clients" style={{ color: "var(--accent)" }}>
                    Clients
                  </Link>{" "}
                  page.
                </p>
              </div>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Date Paid</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", width: "2.5rem" }}>{i + 1}</td>
                      <td>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.client.name}</span>
                      </td>
                      <td>
                        <span style={{ color: "var(--success)", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                          ₱{Number(p.amount).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {new Date(p.paidAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => { if (!closed) deletePayment(p.id, p.client.name, p.amount); }}
                            disabled={closed}
                            title={closed ? "Billing period is closed" : "Delete payment"}
                            className="btn btn-danger btn-sm"
                            style={{ opacity: closed ? 0.4 : 1 }}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="tbl-footer" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{payments.length} transaction{payments.length !== 1 ? "s" : ""}</span>
                <span style={{ color: "var(--success)", fontWeight: 700 }}>Total: ₱{total.toLocaleString()}</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
