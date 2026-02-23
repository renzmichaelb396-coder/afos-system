"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Payment = {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  date: string; // YYYY-MM-DD
};

const PAYMENTS_KEY = "afos_payments_v1";

function genId() {
  // best unique id available in browser
  // (crypto.randomUUID exists in modern browsers)
  // fallback if not available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadPaymentsAndFix(): Payment[] {
  let arr: Payment[] = [];
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Payment[]) : [];
    arr = Array.isArray(parsed) ? parsed : [];
  } catch {
    arr = [];
  }

  // Fix duplicates (and missing ids) so React keys are always unique
  const seen = new Set<string>();
  let changed = false;

  const fixed = arr.map((p) => {
    const id = (p?.id ?? "").toString();
    if (!id || seen.has(id)) {
      changed = true;
      const newId = genId();
      seen.add(newId);
      return { ...p, id: newId };
    }
    seen.add(id);
    return p;
  });

  if (changed) {
    try {
      localStorage.setItem(PAYMENTS_KEY, JSON.stringify(fixed));
    } catch {
      // ignore
    }
  }

  return fixed;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  function refresh() {
    setPayments(loadPaymentsAndFix());
  }

  useEffect(() => {
    refresh();

    const onUpdate = () => refresh();
    const onVisible = () => {
      if (!document.hidden) refresh();
    };

    window.addEventListener("afos_payments_updated", onUpdate as EventListener);
    window.addEventListener("focus", onUpdate);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("afos_payments_updated", onUpdate as EventListener);
      window.removeEventListener("focus", onUpdate);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const total = useMemo(() => payments.reduce((s, p) => s + (Number(p.amount) || 0), 0), [payments]);

  const sorted = useMemo(() => {
    return [...payments].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [payments]);

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Payments</h1>
          <div style={{ opacity: 0.7, marginTop: 6 }}>This page auto-fixes duplicate payment IDs.</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={refresh}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}
          >
            Refresh
          </button>

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

        {sorted.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No payments yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {sorted.map((p) => (
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
                  <div style={{ fontWeight: 800 }}>{p.clientName}</div>
                  <div style={{ opacity: 0.7, fontSize: 13 }}>{p.date}</div>
                </div>
                <div style={{ fontWeight: 800 }}>₱ {Number(p.amount).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
