import Link from "next/link";

export default function LoginPage() {
  return (
    <main style={{ fontFamily: "Arial", padding: 40, maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: 36 }}>Login</h1>
      <p style={{ marginTop: 8 }}>
        (Real login later. For now this button takes you to the Dashboard.)
      </p>

      <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
        <input
          placeholder="Email"
          style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}
        />
        <input
          placeholder="Password"
          type="password"
          style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}
        />

        <Link href="/dashboard">
          <button style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}>
            Login
          </button>
        </Link>
      </div>
    </main>
  );
}
