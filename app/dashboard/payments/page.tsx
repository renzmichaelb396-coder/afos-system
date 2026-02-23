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
  payments: PaymentRow[];
};

function monthLabel(m: number) {
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[m - 1] ?? `M${m}`;
}

export default function PaymentsPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, [now]);

  async function load(y: number, m: number) {
    setLoading(true);
    const res = await fetch(`/api/payments?year=${y}&month=${m}`);
    const data = (await res.json()) as PaymentsResponse;

    setYear(Number(data?.year ?? y));
    setMonth(Number(data?.month ?? m));
    setPayments(Array.isArray(data?.payments) ? data.payments : []);
    setLoading(false);
  }

  async function deletePayment(paymentId: string, clientName: string, amount: number) {
    const confirmed = window.confirm(`Delete payment ₱${amount.toLocaleString()} for ${clientName}?`);
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

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Payments</h1>
          <div style={{ opacity: 0.7, marginTop: 6 }}>
            Viewing: {monthLabel(month)} {year}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={year}
            onChange={(e) => {
              const y = Number(e.target.value);
              setYear(y);
              load(y, month);
            }}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            value={month}
            onChange={(e) => {
              const m = Number(e.target.value);
              setMonth(m);
              load(year, m);
            }}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const m = i + 1;
              return (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              );
            })}
          </select>

          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <span style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}>Back</span>
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 18, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>Total collected</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>₱ {total.toLocaleString()}</div>
      </div>

      <div style={{ marginTop: 18, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, margin: 0, marginBottom: 12 }}>History</h2>

        {payments.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No payments for this period.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {payments.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  border: "1px solid #eee",
                  borderRadius: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>{p.client.name}</div>
                  <div style={{ opacity: 0.7, fontSize: 13 }}>
                    {new Date(p.paidAt).toISOString().slice(0, 10)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>₱ {Number(p.amount).toLocaleString()}</div>

                  <button
                    onClick={() => deletePayment(p.id, p.client.name, p.amount)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      background: "#fff",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
