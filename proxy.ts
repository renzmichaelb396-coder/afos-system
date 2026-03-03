/**
 * middleware.ts
 *
 * Next.js Edge Middleware — runs before every matched request.
 *
 * Responsibilities:
 *  1. Inject security headers on every response (HSTS, CSP, X-Frame, etc.)
 *  2. Protect dashboard routes — redirect to /login if no session cookie.
 *  3. Protect API routes — return 401 JSON if no session cookie.
 *
 * NOTE: Prisma cannot run in the Edge runtime. The middleware only reads the
 * cookie value; full user validation (DB lookup + role check) is performed
 * inside each API route handler via requireUser().
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const IS_PROD = process.env.NODE_ENV === "production";

// Routes that require an authenticated session
const PROTECTED_PAGES = ["/dashboard"];
const PROTECTED_API = [
  "/api/clients",
  "/api/payments",
  "/api/billing",
  "/api/audit",
  "/api/reminders",
];

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isProtectedApi(pathname: string): boolean {
  return PROTECTED_API.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get("afos_session");

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (isProtectedPage(pathname) && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isProtectedApi(pathname) && !session) {
    return NextResponse.json(
      { error: "Unauthorized", code: "AUTH_UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // ── Security headers ──────────────────────────────────────────────────────
  const res = NextResponse.next();

  // Strict-Transport-Security: enforce HTTPS for 1 year (production only)
  if (IS_PROD) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Prevent clickjacking
  res.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME-type sniffing
  res.headers.set("X-Content-Type-Options", "nosniff");

  // Control referrer information
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Disable browser features not needed by this app
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // Content-Security-Policy
  // - default-src 'self'           : only load resources from same origin
  // - script-src 'self' 'unsafe-inline' : Next.js inline scripts require unsafe-inline
  // - style-src  'self' 'unsafe-inline' : Tailwind inline styles
  // - img-src    'self' data:           : allow data URIs for SVG icons
  // - font-src   'self' https://fonts.gstatic.com : Google Fonts
  // - connect-src 'self'                : API calls to same origin only
  // - frame-ancestors 'none'            : belt-and-suspenders against clickjacking
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
