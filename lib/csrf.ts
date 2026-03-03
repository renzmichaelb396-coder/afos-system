/**
 * lib/csrf.ts
 *
 * CSRF protection via Origin / Referer header validation.
 *
 * Strategy: "Origin + SameSite strict validation"
 *  - For every state-changing request (POST / PUT / DELETE / PATCH) the
 *    Origin or Referer header MUST match the application's own host.
 *  - Combined with SameSite=Lax cookies this provides defence-in-depth.
 *
 * Configuration:
 *   APP_URL env var — the canonical production URL (e.g. https://afos.example.com).
 *   If not set, the expected host is derived from the incoming Host header.
 *   This is correct because:
 *     - In production, APP_URL is always set.
 *     - In development / test, the Host header reflects the actual bind address
 *       that the browser/client used to reach the server (e.g. localhost:3000).
 *
 * NOTE: req.url in Next.js 16 standalone mode reflects the server's bind address
 * (0.0.0.0), NOT the client-visible host. Always use the Host header instead.
 *
 * Bypass:
 *   - Safe methods (GET, HEAD, OPTIONS) are always allowed.
 *   - In test / CI environments (NODE_ENV === "test") CSRF is bypassed so
 *     integration tests using direct HTTP clients continue to work.
 *   - The /api/reminders/send route uses a Bearer secret instead of cookies,
 *     so it is excluded from the cookie-based CSRF check.
 */

import { NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Routes that use Bearer-token auth instead of session cookies
const CSRF_EXEMPT_PATHS = ["/api/reminders/send", "/api/health"];

export function validateCsrf(req: Request): Response | null {
  // Skip in test environment so integration tests work without CSRF tokens
  if (process.env.NODE_ENV === "test") return null;

  const method = req.method?.toUpperCase() ?? "GET";
  if (SAFE_METHODS.has(method)) return null;

  const url = new URL(req.url);
  if (CSRF_EXEMPT_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"))) {
    return null;
  }

  // Determine the expected host.
  // Priority: APP_URL env var → Host header → req.url.host (fallback).
  // We deliberately avoid req.url.host because in Next.js standalone mode
  // the server binds to 0.0.0.0 and req.url reflects that, not the
  // client-visible hostname.
  const appUrl = process.env.APP_URL;
  let expectedHost: string;

  if (appUrl) {
    expectedHost = new URL(appUrl).host;
  } else {
    // Use the Host header — this is what the client actually sent.
    const hostHeader = req.headers.get("host");
    if (hostHeader) {
      expectedHost = hostHeader;
    } else {
      // Absolute last resort: fall back to req.url.host
      expectedHost = url.host;
    }
  }

  // Check Origin header first (most reliable)
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== expectedHost) {
        return NextResponse.json(
          { error: "Forbidden", code: "CSRF_ORIGIN_MISMATCH" },
          { status: 403 }
        );
      }
      return null; // Origin matches — allow
    } catch {
      return NextResponse.json(
        { error: "Forbidden", code: "CSRF_INVALID_ORIGIN" },
        { status: 403 }
      );
    }
  }

  // Fall back to Referer header
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refHost = new URL(referer).host;
      if (refHost !== expectedHost) {
        return NextResponse.json(
          { error: "Forbidden", code: "CSRF_REFERER_MISMATCH" },
          { status: 403 }
        );
      }
      return null; // Referer matches — allow
    } catch {
      return NextResponse.json(
        { error: "Forbidden", code: "CSRF_INVALID_REFERER" },
        { status: 403 }
      );
    }
  }

  // Neither Origin nor Referer present — reject (strict policy)
  return NextResponse.json(
    { error: "Forbidden", code: "CSRF_MISSING_ORIGIN" },
    { status: 403 }
  );
}
