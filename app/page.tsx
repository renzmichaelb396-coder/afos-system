import Link from "next/link";

export default function Home() {
  return (
    <main style={{ fontFamily: "Arial", padding: 40 }}>
      <h1 style={{ fontSize: 42 }}>AFOS Payment System</h1>

      <p style={{ fontSize: 18, marginTop: 10 }}>
        A simple system for accounting firms to track who paid and who didn’t.
      </p>

      <div style={{ marginTop: 30 }}>
        <h2>What this system will do:</h2>
        <ul>
          <li>Add clients</li>
          <li>Set monthly fee</li>
          <li>Track Paid / Unpaid</li>
          <li>Send payment reminders</li>
        </ul>
      </div>

      <div style={{ marginTop: 40 }}>
        <Link href="/login">
          <button style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}>
            Go to Login
          </button>
        </Link>
      </div>
    </main>
  );
}
