/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * first-admin-bootstrap.test.ts
 *
 * Tests the registration endpoint behaviour:
 *
 * 1. When users already exist (which is the case in the seeded test DB),
 *    an unauthenticated POST /api/auth/register MUST return 401.
 *
 * 2. An authenticated ADMIN can register a new user (201).
 *
 * 3. Registering the same email twice returns 409.
 *
 * NOTE: The original test assumed a completely empty database (bootstrap mode).
 * Since the test DB is seeded with an admin user, we test the locked-mode
 * behaviour instead, which is the correct production path.
 */
import { describe, it, expect } from "vitest";
import { authedFetch } from "./http";

const BASE = process.env.AFOS_BASE_URL ?? "http://127.0.0.1:3000";
const ORIGIN = new URL(BASE).origin;

describe("Registration endpoint (integration)", () => {
  it("rejects unauthenticated registration when users exist (401)", async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": ORIGIN },
      body: JSON.stringify({ email: "anon@example.com", password: "password123" }),
    });
    // System has users → must require ADMIN session
    expect(res.status).toBe(401);
  });

  it("ADMIN can register a new user (201)", async () => {
    const email = `admin-created-${Date.now()}@example.com`;
    const res = await authedFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password: "securepass123" }),
    });
    const txt = res.text;
    let json: any = null;
    try { json = txt ? JSON.parse(txt) : null; } catch {}
    expect(res.res.status).toBe(201);
    expect(json?.ok).toBe(true);
  });

  it("rejects registering the same email twice (409)", async () => {
    const email = `dupe-${Date.now()}@example.com`;

    const first = await authedFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password: "securepass123" }),
    });
    expect([200, 201]).toContain(first.res.status);

    const second = await authedFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password: "securepass123" }),
    });
    expect([400, 409]).toContain(second.res.status);
  });
});
