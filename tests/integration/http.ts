/* eslint-disable @typescript-eslint/no-explicit-any */
import dotenv from "dotenv";

dotenv.config({ path: ".env.test", override: true });

const BASE = process.env.AFOS_BASE_URL ?? "http://127.0.0.1:3000";
// Derive the Origin from BASE for CSRF validation
const ORIGIN = new URL(BASE).origin;

const SEED_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "stella.trusova@gmail.com";
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";
if (!SEED_PASSWORD) throw new Error("SEED_ADMIN_PASSWORD missing");

function extractAfosSession(setCookie: string | null) {
  if (!setCookie) return null;

  // Can be single header or comma-joined; find the afos_session pair anywhere
  const m = setCookie.match(/afos_session=[^;]+/);
  return m ? m[0] : null;
}

let _cachedCookie: string | null = null;

export async function loginAsSeedAdmin() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": ORIGIN },
    body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
  });

  const text = await res.text();
  const setCookie = res.headers.get("set-cookie");
  const cookie = extractAfosSession(setCookie);

  if (process.env.TEST_DEBUG === "1") {
    console.log("LOGIN_DEBUG:", {
      status: res.status,
      hasSetCookie: !!setCookie,
      setCookieSample: setCookie ? setCookie.slice(0, 120) : null,
      cookieParsed: cookie ? cookie.slice(0, 60) : null,
      email: SEED_EMAIL,
      base: BASE,
    });
  }

  return { res, text, cookie, BASE };
}

export async function authedFetch(path: string, init: RequestInit = {}) {
  // Ensure we have a cookie
  if (!_cachedCookie) {
    const login = await loginAsSeedAdmin();
    _cachedCookie = login.cookie;
    if (!_cachedCookie) {
      return { res: new Response(null, { status: login.res.status || 401 }), json: null, text: login.text };
    }
  }

  const mkHeaders = (cookie: string) => {
    const headers = new Headers(init.headers as any);
    headers.set("Cookie", cookie);
    headers.set("Origin", ORIGIN);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return headers;
  };

  // First attempt
  let res = await fetch(`${BASE}${path}`, { ...init, headers: mkHeaders(_cachedCookie) });
  let txt = await res.text();

  // If the session became invalid (or cookie was bad), relogin once and retry
  if (res.status === 401) {
    _cachedCookie = null;

    const login = await loginAsSeedAdmin();
    _cachedCookie = login.cookie;

    if (_cachedCookie) {
      res = await fetch(`${BASE}${path}`, { ...init, headers: mkHeaders(_cachedCookie) });
      txt = await res.text();
    }
  }

  let json: any = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {}

  return { res, json, text: txt };
}
