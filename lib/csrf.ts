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
 *   The expected host is ALWAYS derived from the incoming Host header so that
 *   same-origin requests succeed regardless of which subdomain or alias Vercel
 *   routes the request through (e.g. per-deployment preview URLs).
 *   APP_URL is kept as an additional allowed host for cross-origin scenarios
 *   (e.g. a custom domain pointing to the same deployment).
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

  // Build the set of allowed hosts.
  // Primary: the Host header — this is what the browser actually used to reach
  // the server, so a same-origin request will always have a matching Origin.
  // This correctly handles Vercel per-deployment URLs, preview URLs, and
  // custom domain aliases without any additional configuration.
  // Secondary: APP_URL host (if set) — allows a canonical domain to be
  // accepted even when the request arrives via a different alias.
  const allowedHosts = new Set<string>();

  const hostHeader = req.headers.get("host");
  if (hostHeader) {
    allowedHosts.add(hostHeader.toLowerCase());
  }

  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try {
      allowedHosts.add(new URL(appUrl).host.toLowerCase());
    } catch {
      // Invalid APP_URL — ignore
    }
  }

  // If we have no allowed hosts at all, fall back to req.url.host
  if (allowedHosts.size === 0) {
    allowedHosts.add(url.host.toLowerCase());
  }

  // Check Origin header first (most reliable)
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (!allowedHosts.has(originHost)) {
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
      const refHost = new URL(referer).host.toLowerCase();
      if (!allowedHosts.has(refHost)) {
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
