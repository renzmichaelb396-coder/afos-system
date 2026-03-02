/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";

const BASE = process.env.AFOS_BASE_URL ?? "http://127.0.0.1:3000";

describe("First admin bootstrap (integration)", () => {
  it("allows registering a new admin (201)", async () => {
    const email = "bootstrap-admin@example.com";
    const password = "bootstrap-pass-123";

    const res = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const txt = await res.text();
    let json: any = null;
    try { json = txt ? JSON.parse(txt) : null; } catch {}

    expect(res.status).toBe(201);
    expect(json?.ok).toBe(true);
  });

  it("rejects registering the same email twice (409 or 400)", async () => {
    const email = "bootstrap-admin-dupe@example.com";
    const password = "bootstrap-pass-123";

    const first = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect([200, 201]).toContain(first.status);

    const second = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    // depending on implementation, could be 409 conflict or 400 bad request
    expect([400, 409]).toContain(second.status);
  });
});
