"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ClientRow = {
  id: string;
  name: string;
  email?: string | null;
  monthlyFee: number;
  createdAt: string;
  status: "PAID" | "UNPAID";
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [name, setName] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadClients() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault();

    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        monthlyFee: Number(monthlyFee),
      }),
    });

    setName("");
    setMonthlyFee("");
    loadClients();
  }

  async function recordPayment(clientId: string, amount: number, clientName: string) {
    const confirmed = window.confirm(`Record payment of ₱${amount.toLocaleString()} for ${clientName}?`);
    if (!confirmed) return;

    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, amount }),
    });

    loadClients();
  }

  useEffect(() => {
    loadClients();
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <main style={{ padding: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 32 }}>Clients</h1>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <span style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}>Back</span>
        </Link>
      </div>

      <form onSubmit={createClient} style={{ marginTop: 20 }}>
        <input
          placeholder="Client name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ marginRight: 10 }}
        />
        <input
          placeholder="Monthly fee"
          type="number"
          value={monthlyFee}
          onChange={(e) => setMonthlyFee(e.target.value)}
          required
          style={{ marginRight: 10 }}
        />
        <button type="submit">Add</button>
      </form>

      <div style={{ marginTop: 30 }}>
        {clients.map((c) => (
          <div
            key={c.id}
            style={{
              padding: 12,
              borderBottom: "1px solid #ddd",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <strong>{c.name}</strong> — ₱{c.monthlyFee} — {c.status}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Link
                href="/dashboard/payments"
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  textDecoration: "none",
                }}
              >
                View Payments
              </Link>

              <button
                onClick={() => recordPayment(c.id, c.monthlyFee, c.name)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: "#fff",
                }}
              >
                Record Payment
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
