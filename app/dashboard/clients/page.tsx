"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Client = {
  id: string;
  name: string;
  monthlyFee: number;
  status: "PAID" | "UNPAID";
};
const STORAGE_KEY = "afos_clients_v1";
export default function ClientsPage() {
  const defaultClients: Client[] = [
  { id: "a", name: "Client A", monthlyFee: 5000, status: "UNPAID" },
  { id: "b", name: "Client B", monthlyFee: 8000, status: "PAID" },
  { id: "c", name: "Client C", monthlyFee: 6500, status: "UNPAID" },
];

const [clients, setClients] = useState<Client[]>(defaultClients);
// Load from localStorage on first mount
useEffect(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultClients));
      return;
    }
    const parsed = JSON.parse(raw) as Client[];
    if (Array.isArray(parsed)) setClients(parsed);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultClients));
    setClients(defaultClients);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// Save to localStorage whenever clients changes
useEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  } catch {
    // ignore write errors
  }
}, [clients]);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [status, setStatus] = useState<Client["status"]>("UNPAID");

  const totals = useMemo(() => {
    const paid = clients
      .filter((c) => c.status === "PAID")
      .reduce((sum, c) => sum + c.monthlyFee, 0);
    const unpaid = clients
      .filter((c) => c.status === "UNPAID")
      .reduce((sum, c) => sum + c.monthlyFee, 0);
    return { paid, unpaid, total: paid + unpaid };
  }, [clients]);

  function addClient() {
    const trimmed = name.trim();
    const numFee = Number(fee);

    if (!trimmed) return alert("Enter a client name.");
    if (!Number.isFinite(numFee) || numFee <= 0) return alert("Enter a valid monthly fee.");

    const id = crypto.randomUUID();
    setClients((prev) => [
      { id, name: trimmed, monthlyFee: numFee, status },
      ...prev,
    ]);

    setName("");
    setFee("");
    setStatus("UNPAID");
  }

  function toggleStatus(id: string) {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === "PAID" ? "UNPAID" : "PAID" } : c
      )
    );
  }

  function removeClient(id: string) {
    setClients((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <main style={{ fontFamily: "Arial", padding: 40, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: 40, marginBottom: 8 }}>Clients</h1>
      <p style={{ opacity: 0.85 }}>
        Add clients, track monthly fee, and toggle PAID / UNPAID.
      </p>

      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span style={pillStyle}>Total: ₱{totals.total.toLocaleString()}</span>
        <span style={pillStyle}>Paid: ₱{totals.paid.toLocaleString()}</span>
        <span style={pillStyle}>Unpaid: ₱{totals.unpaid.toLocaleString()}</span>
      </div>

      <section
        style={{
          marginTop: 22,
          padding: 16,
          border: "1px solid #333",
          borderRadius: 16,
        }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 10 }}>Add Client</h2>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 180px 180px 120px" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Client name"
            style={inputStyle}
          />
          <input
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="Monthly fee (₱)"
            inputMode="numeric"
            style={inputStyle}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={inputStyle}>
            <option value="UNPAID">UNPAID</option>
            <option value="PAID">PAID</option>
          </select>
          <button onClick={addClient} style={buttonStyle}>
            Add
          </button>
        </div>
      </section>

      <section style={{ marginTop: 22, display: "grid", gap: 12 }}>
        {clients.map((c) => (
          <div
            key={c.id}
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid #333",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{c.name}</div>
              <div style={{ opacity: 0.85 }}>Monthly fee: ₱{c.monthlyFee.toLocaleString()}</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => toggleStatus(c.id)}
                style={{
                  ...pillButtonStyle,
                  borderColor: c.status === "PAID" ? "#2b8a3e" : "#555",
                }}
              >
                {c.status}
              </button>
              <button onClick={() => removeClient(c.id)} style={dangerStyle}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </section>

      <div style={{ marginTop: 26, display: "flex", gap: 10 }}>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <button style={buttonStyle}>Back to Dashboard</button>
        </Link>
        <Link href="/" style={{ textDecoration: "none" }}>
          <button style={buttonStyle}>Home</button>
        </Link>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #333",
  background: "transparent",
  color: "inherit",
};

const buttonStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #333",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
};

const dangerStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #7a2b2b",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
};

const pillStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid #333",
};

const pillButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid #333",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
};
